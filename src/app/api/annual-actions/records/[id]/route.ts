/**
 * PATCH /api/annual-actions/records/[id] — Edita ou valida um registro.
 * DELETE /api/annual-actions/records/[id] — Exclui registro.
 *
 * Ao aprovar (SUPER_USER):
 *   1. Atualiza DB
 *   2. Sincroniza com Google Sheets ("Tabela 2" e "Registros")
 *   3. Envia e-mail ao autor com resultado
 *
 * Ao rejeitar/solicitar ajuste:
 *   1. Atualiza DB
 *   2. Envia e-mail ao autor com resultado e nota
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getApprovedUser } from "@/lib/auth-helpers";
import { sendActivityValidatedEmail } from "@/lib/mailer";

import {
  TAB_T2, TAB_LOG,
  getGoogleToken, SB, shGet, shSet, shAppend,
  ensureSheet, getSheets, formatSheet,
} from "@/lib/sheets-helpers";

// ─── Schemas ──────────────────────────────────────────────────────────────────
const editSchema = z.object({
  action:          z.literal("edit"),
  nome:            z.string().min(1).optional(),
  tipo:            z.string().optional(),
  statusAtividade: z.string().optional(),
  evidencia:       z.string().optional(),
  dataRealizacao:  z.string().optional(),
  participantes:   z.string().optional(),
  canal:           z.string().optional(),
  alcance:         z.string().optional(),
  financiador:     z.string().optional(),
  valorAprovado:   z.string().optional(),
  moeda:           z.string().optional(),
});

const validateSchema = z.object({
  action:         z.literal("validate"),
  activityStatus: z.enum(["APPROVED", "REJECTED", "ADJUSTMENT_NEEDED"]),
  notaValidacao:  z.string().optional(),
});

const bodySchema = z.discriminatedUnion("action", [editSchema, validateSchema]);

// ─── Mapeamentos ──────────────────────────────────────────────────────────────
const EQUIPE_ROW: Record<string, number> = {
  "Lilian e Antônio": 3, "Olívia e Gabriel": 4, "Márcio e Malvina": 5,
  "Vagner e Regiane": 6, "Vinícius, Kelson e Victor": 7, "Victor Barbosa": 8,
  "Dorcas e Andressa": 9, "Fábio e Roni": 10, "Ângelo e Anathália": 11,
};
const INDICADOR_COL: Record<string, number> = {
  politicas: 2, publicacoes: 3, cursos: 4, tecnologia: 5, divulgacao: 6, recursos: 7,
};

const EQUIPES_LIST = [
  "Lilian e Antônio","Olívia e Gabriel","Márcio e Malvina","Vagner e Regiane",
  "Vinícius, Kelson e Victor","Victor Barbosa","Dorcas e Andressa","Fábio e Roni","Ângelo e Anathália",
];
const IND_HEADERS = [
  "Documento de recomendação\npara políticas públicas",
  "Número de publicações\ncientíficas",
  "Número de cursos, eventos\ne outras ações",
  "Número de projetos\ntecnológicos",
  "Alcance de Divulgação\nnas Redes Sociais",
  "Captação de Recursos\npara Pesquisa e Eventos",
];

function colL(col: number): string {
  let r = ""; let c = col;
  while (c > 0) { c--; r = String.fromCharCode(65 + (c % 26)) + r; c = Math.floor(c / 26); }
  return r;
}

// ─── Garante Tabela 2 no Sheets ───────────────────────────────────────────────
async function ensureTabela2(token: string, sid: string): Promise<void> {
  const sheetId = await ensureSheet(token, sid, TAB_T2);
  const a1 = await shGet(token, sid, TAB_T2, "A1");
  if (a1.trim()) return; // já inicializada

  const ano = new Date().getFullYear();
  // Escreve estrutura inicial
  await fetch(
    `${SB(sid)}/values/${encodeURIComponent(`'${TAB_T2}'!A1`)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        values: [
          [`Tabela 2 – Síntese de Indicadores e principais resultados do CIATEN com detalhamento por núcleo, ${ano}`, ...Array(IND_HEADERS.length).fill("")],
          ["Equipe / Núcleo", ...IND_HEADERS],
          ...EQUIPES_LIST.map(e => [e]),
          ["Total"],
        ],
      }),
    }
  );

  // Formata a aba
  await formatSheet(token, sid, sheetId, {
    titleRow:  0,
    headerRow: 1,
    numCols:   7,
    colWidths: [200, 200, 200, 200, 200, 200, 200],
  });
}

// ─── Garante aba Registros no Sheets ─────────────────────────────────────────
async function ensureLogHeader(token: string, sid: string): Promise<void> {
  await ensureSheet(token, sid, TAB_LOG);
  const a1 = await shGet(token, sid, TAB_LOG, "A1");
  if (a1.trim()) return;
  await shAppend(token, sid, TAB_LOG, [
    "ID","Data/Hora Envio","Ano","Equipe","Indicador (chave)","Indicador completo",
    "Nome do produto/atividade","Tipo","Situação da atividade","Evidência / Link",
    "Data de realização","Participantes","Canal","Alcance","Financiador",
    "Valor aprovado","Moeda","Aprovado por","Data de aprovação",
  ]);
}

type DbRecord = Awaited<ReturnType<typeof prisma.activityRecord.findUniqueOrThrow>>;
type DbRecordWithAuthor = DbRecord & { author: { id: string; name: string | null; email: string } };

function formatCelula(r: DbRecord): string {
  const l: string[] = [r.nome];
  if (r.tipo)            l.push(`Tipo: ${r.tipo}`);
  if (r.statusAtividade) l.push(`Status: ${r.statusAtividade}`);
  if (r.evidencia)       l.push(`Link: ${r.evidencia}`);
  if (r.dataRealizacao)  l.push(`Data: ${r.dataRealizacao}`);
  if (r.participantes)   l.push(`Participantes: ${r.participantes}`);
  if (r.canal)           l.push(`Canal: ${r.canal}`);
  if (r.alcance)         l.push(`Alcance: ${r.alcance}`);
  if (r.financiador)     l.push(`Financiador: ${r.financiador}`);
  if (r.valorAprovado)   l.push(`Valor: ${r.valorAprovado} ${r.moeda ?? "BRL"}`);
  l.push(`[${r.createdAt.toLocaleDateString("pt-BR")} — ID ${r.id}]`);
  return l.join("\n");
}

async function syncToSheets(record: DbRecord, validadorNome: string): Promise<void> {
  const sid = process.env.GOOGLE_SHEETS_ID;
  if (!sid || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    console.warn("[sync] Google Sheets não configurado — pulando.");
    return;
  }
  const token = await getGoogleToken();
  await ensureTabela2(token, sid);
  await ensureLogHeader(token, sid);

  // Grava na célula correta da Tabela 2
  const row = EQUIPE_ROW[record.equipe];
  const col = INDICADOR_COL[record.indicadorKey];
  if (row && col) {
    const addr     = `${colL(col)}${row}`;
    const existing = await shGet(token, sid, TAB_T2, addr);
    const nova     = formatCelula(record);
    await shSet(token, sid, TAB_T2, addr, existing.trim() ? `${existing}\n\n──────\n${nova}` : nova);
  }

  // Grava no log
  await shAppend(token, sid, TAB_LOG, [
    record.id,
    record.createdAt.toISOString(),
    String(record.ano),
    record.equipe,
    record.indicadorKey,
    record.indicador,
    record.nome,
    record.tipo ?? "",
    record.statusAtividade ?? "",
    record.evidencia ?? "",
    record.dataRealizacao ?? "",
    record.participantes ?? "",
    record.canal ?? "",
    record.alcance ?? "",
    record.financiador ?? "",
    record.valorAprovado ?? "",
    record.moeda ?? "",
    validadorNome,
    new Date().toISOString(),
  ]);
}

// ─── PATCH ────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApprovedUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const record = await prisma.activityRecord.findUnique({
    where: { id: params.id },
    include: { author: { select: { id: true, name: true, email: true } } },
  }) as DbRecordWithAuthor | null;
  if (!record) return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  // ── Edição pelo autor ──────────────────────────────────────────────────────
  if (parsed.data.action === "edit") {
    if (record.authorId !== user.id) {
      return NextResponse.json({ error: "Sem permissão para editar." }, { status: 403 });
    }
    if (!["PENDING", "ADJUSTMENT_NEEDED"].includes(record.activityStatus)) {
      return NextResponse.json({ error: "Registro não pode ser editado neste estado." }, { status: 422 });
    }
    const { action: _a, ...fields } = parsed.data;
    const updated = await prisma.activityRecord.update({
      where: { id: params.id },
      data: { ...fields, activityStatus: "PENDING", ultimaEdicao: new Date() },
      include: {
        author:      { select: { id: true, name: true, email: true } },
        validatedBy: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(updated);
  }

  // ── Validação pelo SUPER_USER ──────────────────────────────────────────────
  if (parsed.data.action === "validate") {
    if (user.role !== "SUPER_USER") {
      return NextResponse.json({ error: "Apenas coordenadores podem validar." }, { status: 403 });
    }

    const newStatus     = parsed.data.activityStatus as "APPROVED" | "REJECTED" | "ADJUSTMENT_NEEDED";
    const nota          = parsed.data.notaValidacao ?? null;
    const validadorNome = user.name ?? user.email ?? "Coordenação";
    const appUrl        = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const updated = await prisma.activityRecord.update({
      where: { id: params.id },
      data: {
        activityStatus: newStatus,
        notaValidacao:  nota,
        validatedById:  user.id,
        validatedAt:    new Date(),
      },
      include: {
        author:      { select: { id: true, name: true, email: true } },
        validatedBy: { select: { id: true, name: true } },
      },
    });

    // Sincroniza com Sheets somente na aprovação
    let sheetsError: string | undefined;
    if (newStatus === "APPROVED" && !record.syncedToSheets) {
      try {
        await syncToSheets(updated, validadorNome);
        await prisma.activityRecord.update({
          where: { id: params.id },
          data: { syncedToSheets: true, syncedAt: new Date() },
        });
      } catch (err) {
        sheetsError = err instanceof Error ? err.message : "Erro na sincronização.";
        console.error("[validate] Sheets sync falhou:", sheetsError);
      }
    }

    // Envia e-mail ao autor com resultado — aguarda para garantir envio
    const authorEmail = record.author?.email;
    if (authorEmail) {
      try {
        await sendActivityValidatedEmail({
          to:              authorEmail,
          authorName:      record.author.name ?? "Usuário",
          recordNome:      record.nome,
          recordIndicador: record.indicador,
          newStatus,
          notaValidacao:   nota,
          validadorName:   validadorNome,
          registrosUrl:    `${appUrl}/annualActionsReport`,
        });
        console.log(`[validate] E-mail enviado para ${authorEmail} — status: ${newStatus}`);
      } catch (err) {
        console.error("[validate] Falha ao enviar e-mail ao autor:", err);
      }
    } else {
      console.warn("[validate] Autor sem e-mail — e-mail não enviado.");
    }

    return NextResponse.json({ ...updated, sheetsError });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getApprovedUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const record = await prisma.activityRecord.findUnique({ where: { id: params.id } });
  if (!record) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  if (record.authorId !== user.id && user.role !== "SUPER_USER") {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  if (!["PENDING", "ADJUSTMENT_NEEDED"].includes(record.activityStatus)) {
    return NextResponse.json({ error: "Só é possível excluir registros pendentes ou em ajuste." }, { status: 422 });
  }

  await prisma.activityRecord.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}