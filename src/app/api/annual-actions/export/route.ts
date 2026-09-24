/**
 * POST /api/annual-actions/export
 *
 * Exporta dados do banco para o Google Sheets, recriando as abas do zero.
 * Apenas SUPER_USER pode chamar este endpoint.
 *
 * Body: { target: "tabela1" | "tabela2" | "registros" }
 *
 * Abas criadas/recriadas com nomes canônicos (vindos de sheets-helpers):
 *   "Tabela 1", "Tabela 2", "Registros"
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUser } from "@/lib/auth-helpers";
import {
  TAB_T1, TAB_T2, TAB_LOG,
  getGoogleToken, recreateSheet, writeToSheet, formatSheet,
} from "@/lib/sheets-helpers";

const bodySchema = z.object({
  target: z.enum(["tabela1", "tabela2", "registros"]),
});

// ─── Constantes de domínio ────────────────────────────────────────────────────
const EQUIPES = [
  "Lilian e Antônio","Olívia e Gabriel","Márcio e Malvina","Vagner e Regiane",
  "Vinícius, Kelson e Victor","Victor Barbosa","Dorcas e Andressa","Fábio e Roni","Ângelo e Anathália",
];

// Cabeçalhos das colunas da Tabela 2 — completos, com \n para quebrar dentro da célula
const IND_HEADERS_T2 = [
  "Documento de recomendação\npara políticas públicas",
  "Número de publicações\ncientíficas",
  "Número de cursos, eventos\ne outras ações realizadas por período",
  "Número de projetos voltados ao\ndesenvolvimento tecnológico",
  "Alcance de Divulgação\nnas Redes Sociais",
  "Captação de Recursos para\nPesquisa, Inovação e Eventos",
];

const INDICADOR_COL: Record<string, number> = {
  politicas: 0, publicacoes: 1, cursos: 2, tecnologia: 3, divulgacao: 4, recursos: 5,
};

function contabiliza(r: { indicadorKey: string; statusAtividade: string | null; evidencia: string | null }): number {
  if (!r.evidencia) return 0;
  const k = r.indicadorKey; const s = r.statusAtividade ?? "";
  if (k === "politicas" || k === "cursos")  return s === "Concluído" ? 1 : 0;
  if (k === "publicacoes") return ["Aceito","Publicado"].includes(s) ? 1 : 0;
  if (k === "tecnologia")  return ["Piloto","Implementado"].includes(s) ? 1 : 0;
  if (k === "divulgacao")  return 1;
  if (k === "recursos")    return ["Aprovado","Recurso recebido"].includes(s) ? 1 : 0;
  return 0;
}

// ─── Tipo do registro com relações ───────────────────────────────────────────
type FullRecord = {
  id: string; equipe: string; indicadorKey: string; indicador: string; nome: string;
  tipo: string | null; statusAtividade: string | null; evidencia: string | null;
  dataRealizacao: string | null; participantes: string | null; canal: string | null;
  alcance: string | null; financiador: string | null; valorAprovado: string | null;
  moeda: string | null; activityStatus: string; createdAt: Date;
  syncedToSheets: boolean; syncedAt: Date | null; notaValidacao: string | null;
  validatedAt: Date | null; ano: number;
  author: { name: string | null; email: string };
  validatedBy: { name: string | null } | null;
};

// ─── Builders ────────────────────────────────────────────────────────────────
function buildTabela1(records: FullRecord[], ano: number): string[][] {
  const totais: Record<string, number> = { politicas:0, publicacoes:0, cursos:0, tecnologia:0, divulgacao:0 };
  let recursos_brl = 0, recursos_usd = 0;

  records.forEach((r) => {
    if (r.activityStatus !== "APPROVED" || !contabiliza(r)) return;
    if (r.indicadorKey === "divulgacao") totais.divulgacao += Number(r.alcance ?? 0);
    else if (r.indicadorKey === "recursos") {
      if (r.moeda === "BRL") recursos_brl += Number(r.valorAprovado ?? 0);
      else if (r.moeda === "USD") recursos_usd += Number(r.valorAprovado ?? 0);
    } else totais[r.indicadorKey]++;
  });

  const fmtBrl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const res_str = [
    recursos_brl > 0 ? fmtBrl(recursos_brl) : "",
    recursos_usd > 0 ? `US$ ${recursos_usd.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "",
  ].filter(Boolean).join(" + ") || "R$ 0,00";

  const LINHAS = [
    { key: "politicas",   label: "Documentos de recomendação para políticas públicas",   mede: "Capacidade do CIATEN de produzir evidências aplicáveis à tomada de decisão e apoiar gestores com proposições claras.", calc: "Contagem de documentos com recomendações (mapas de evidências, relatórios técnicos, sínteses) que foram concluídos e validados.", res: `${totais.politicas} documento${totais.politicas !== 1 ? "s" : ""}` },
    { key: "publicacoes", label: "Publicações científicas",                              mede: "Produção de conhecimento técnico-científico vinculada aos núcleos e plataformas do CIATEN.", calc: "Soma de artigos, capítulos, livros, relatórios técnicos com ISSN/ISBN, pré-prints ou aceitações formais.", res: `${totais.publicacoes} publicaç${totais.publicacoes !== 1 ? "ões" : "ão"}` },
    { key: "cursos",      label: "Cursos, eventos e ações de formação",                  mede: "Atividades formativas que qualificam profissionais e difundem conhecimento.", calc: "Número total de cursos, oficinas, workshops, webinários e eventos realizados e validados.", res: `${totais.cursos} ação${totais.cursos !== 1 ? "ões" : ""} formativa${totais.cursos !== 1 ? "s" : ""}` },
    { key: "tecnologia",  label: "Projetos de inovação e desenvolvimento tecnológico",   mede: "Iniciativas que envolvem criação, prototipagem ou aprimoramento de tecnologias e soluções inovadoras.", calc: "Contagem de projetos registrados (softwares, dashboards, dispositivos, biotecnologias) em fase de piloto ou implementados.", res: `${totais.tecnologia} projeto${totais.tecnologia !== 1 ? "s" : ""} tecnológico${totais.tecnologia !== 1 ? "s" : ""}` },
    { key: "divulgacao",  label: "Alcance e engajamento nas redes sociais",              mede: "Impacto e visibilidade do CIATEN na comunicação institucional.", calc: "Soma de visualizações, acessos e interações em todas as redes sociais informadas nos registros validados.", res: totais.divulgacao > 0 ? `${totais.divulgacao.toLocaleString("pt-BR")} interações` : "a ser calculado" },
    { key: "recursos",    label: "Captação de recursos institucionais",                  mede: "Capacidade de mobilização financeira para pesquisa, inovação, eventos e parcerias.", calc: "Soma de recursos captados via editais, convênios, cooperações e apoios institucionais aprovados.", res: res_str },
  ];

  return [
    [`Tabela 1 – Síntese de indicadores e principais resultados do CIATEN, ${ano}`, "", "", ""],
    [""],
    ["Indicador", "O que mede", "Como é calculado", String(ano)],
    ...LINHAS.map(l => [l.label, l.mede, l.calc, l.res]),
  ];
}

function buildTabela2(records: FullRecord[], ano: number): string[][] {
  // Agrupa conteúdo: Map< "equipe|indicadorKey", string[] >
  const cells = new Map<string, string[]>();

  records.forEach((r) => {
    if (r.activityStatus !== "APPROVED") return;
    const key = `${r.equipe}|${r.indicadorKey}`;
    const lines: string[] = [r.nome];
    if (r.tipo)            lines.push(`Tipo: ${r.tipo}`);
    if (r.statusAtividade) lines.push(`Status: ${r.statusAtividade}`);
    if (r.evidencia)       lines.push(`Link: ${r.evidencia}`);
    if (r.dataRealizacao)  lines.push(`Data: ${r.dataRealizacao}`);
    if (r.participantes)   lines.push(`Participantes: ${r.participantes}`);
    if (r.canal)           lines.push(`Canal: ${r.canal}`);
    if (r.alcance)         lines.push(`Alcance: ${r.alcance}`);
    if (r.financiador)     lines.push(`Financiador: ${r.financiador}`);
    if (r.valorAprovado)   lines.push(`Valor: ${r.valorAprovado} ${r.moeda ?? "BRL"}`);
    lines.push(`[${new Date(r.createdAt).toLocaleDateString("pt-BR")} — ID ${r.id}]`);
    const entry = lines.join("\n");
    cells.set(key, [...(cells.get(key) ?? []), entry]);
  });

  const IND_KEYS = ["politicas","publicacoes","cursos","tecnologia","divulgacao","recursos"];

  const grid: string[][] = [
    [`Tabela 2 – Síntese de Indicadores e principais resultados do CIATEN com detalhamento por núcleo, ${ano}`, ...Array(IND_HEADERS_T2.length).fill("")],
    ["Equipe / Núcleo", ...IND_HEADERS_T2],
    ...EQUIPES.map(equipe => [
      equipe,
      ...IND_KEYS.map(ind => (cells.get(`${equipe}|${ind}`) ?? []).join("\n\n──────\n")),
    ]),
  ];

  // Linha de totais
  const totais: Record<string, number> = { politicas:0, publicacoes:0, cursos:0, tecnologia:0, divulgacao:0, recursos:0 };
  records.forEach((r) => {
    if (r.activityStatus !== "APPROVED" || !contabiliza(r)) return;
    if (r.indicadorKey === "divulgacao") totais.divulgacao += Number(r.alcance ?? 0);
    else if (r.indicadorKey === "recursos" && r.moeda === "BRL") totais.recursos += Number(r.valorAprovado ?? 0);
    else totais[r.indicadorKey]++;
  });
  const fmtBrl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  grid.push(["Total", ...IND_KEYS.map(k => k === "recursos" ? fmtBrl(totais[k]) : String(totais[k]))]);

  return grid;
}

function buildRegistros(records: FullRecord[]): string[][] {
  return [
    ["ID","Data/Hora Envio","Ano","Status","Equipe","Indicador (chave)",
     "Indicador completo","Nome do produto/atividade","Tipo","Situação da atividade",
     "Evidência / Link","Data de realização","Participantes","Canal","Alcance",
     "Financiador","Valor aprovado","Moeda","Autor","Email do autor",
     "Validado por","Data validação","Nota de validação","Sincronizado no Sheets"],
    ...records.map(r => [
      r.id,
      new Date(r.createdAt).toISOString(),
      r.ano.toString(),
      r.activityStatus,
      r.equipe,
      r.indicadorKey,
      r.indicador,
      r.nome,
      r.tipo ?? "",
      r.statusAtividade ?? "",
      r.evidencia ?? "",
      r.dataRealizacao ?? "",
      r.participantes ?? "",
      r.canal ?? "",
      r.alcance ?? "",
      r.financiador ?? "",
      r.valorAprovado ?? "",
      r.moeda ?? "",
      r.author.name ?? "",
      r.author.email,
      r.validatedBy?.name ?? "",
      r.validatedAt ? new Date(r.validatedAt).toISOString() : "",
      r.notaValidacao ?? "",
      r.syncedToSheets ? "Sim" : "Não",
    ]),
  ];
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await getApprovedUser();
  if (!user)                   return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (user.role !== "SUPER_USER") return NextResponse.json({ error: "Apenas coordenadores podem exportar." }, { status: 403 });

  const sid = process.env.GOOGLE_SHEETS_ID;
  if (!sid || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return NextResponse.json({ error: "Google Sheets não configurado." }, { status: 503 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Target inválido." }, { status: 400 });

  const { target } = parsed.data;
  const ano = new Date().getFullYear();

  try {
    console.log(`[export] Iniciando: ${target}`);
    const token = await getGoogleToken();

    const records = await prisma.activityRecord.findMany({
      include: {
        author:      { select: { name: true, email: true } },
        validatedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }) as FullRecord[];

    let sheetName: string;
    let sheetData: string[][];
    let fmtOpts: Parameters<typeof formatSheet>[3];

    switch (target) {
      case "tabela1":
        sheetName = TAB_T1;
        sheetData = buildTabela1(records, ano);
        // Linha 0 = título, linha 2 = cabeçalho (após linha em branco)
        fmtOpts = { titleRow: 0, headerRow: 2, numCols: 4, colWidths: [340, 320, 320, 180] };
        break;

      case "tabela2":
        sheetName = TAB_T2;
        sheetData = buildTabela2(records, ano);
        // Linha 0 = título, linha 1 = cabeçalho
        fmtOpts = { titleRow: 0, headerRow: 1, numCols: 7, colWidths: [200, 260, 240, 240, 240, 200, 220] };
        break;

      case "registros":
        sheetName = TAB_LOG;
        sheetData = buildRegistros(records);
        // Linha 0 = cabeçalho (sem título)
        fmtOpts = { titleRow: -1, headerRow: 0, numCols: 24, colWidths: Array(24).fill(160) };
        break;
    }

    console.log(`[export] Recriando aba "${sheetName}"...`);
    const sheetId = await recreateSheet(token, sid, sheetName);

    console.log(`[export] Escrevendo ${sheetData.length} linhas...`);
    await writeToSheet(token, sid, sheetName, sheetData);

    // Formatação — pula merge de título se titleRow === -1
    if (fmtOpts.titleRow >= 0) {
      console.log(`[export] Aplicando formatação...`);
      await formatSheet(token, sid, sheetId, fmtOpts);
    } else {
      // Para "Registros" — apenas cabeçalho + wrap
      await formatSheet(token, sid, sheetId, { ...fmtOpts, titleRow: 0 });
    }

    console.log(`[export] Concluído: "${sheetName}"`);
    return NextResponse.json({ success: true, sheet: sheetName, rows: sheetData.length });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[export] Erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
