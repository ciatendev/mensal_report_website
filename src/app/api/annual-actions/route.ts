/**
 * /api/annual-actions — Grava registros no Google Sheets.
 *
 * Aba "Tabela2": estrutura matricial (equipe × indicador).
 * Aba "Registros": log linear, uma linha por envio.
 *
 * Autenticação: Service Account via JWT RS256 → OAuth2 token.
 * Sem dependências externas (usa apenas Web Crypto API nativa do Node.js).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ─── Config ───────────────────────────────────────────────────────────────────
const TAB_TABELA = process.env.GOOGLE_SHEETS_TAB_TABELA ?? "Tabela2";
const TAB_LOG    = process.env.GOOGLE_SHEETS_TAB_LOG    ?? "Registros";

const EQUIPE_ROW: Record<string, number> = {
  "Lilian e Antônio":          3,
  "Olívia e Gabriel":          4,
  "Márcio e Malvina":          5,
  "Vagner e Regiane":          6,
  "Vinícius, Kelson e Victor": 7,
  "Victor Barbosa":            8,
  "Dorcas e Andressa":         9,
  "Fábio e Roni":             10,
  "Ângelo e Anathália":       11,
};

const INDICADOR_COL: Record<string, number> = {
  politicas: 2, publicacoes: 3, cursos: 4,
  tecnologia: 5, divulgacao: 6, recursos: 7,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function colLetter(col: number): string {
  let r = ""; let c = col;
  while (c > 0) { c--; r = String.fromCharCode(65 + (c % 26)) + r; c = Math.floor(c / 26); }
  return r;
}
const cellAddr = (row: number, col: number) => `${colLetter(col)}${row}`;

// ─── Validação ────────────────────────────────────────────────────────────────
const registroSchema = z.object({
  id: z.string(), timestamp: z.string(), ano: z.number(),
  equipe: z.string().min(1), indicador_key: z.string().min(1), indicador: z.string(),
  nome: z.string().min(1), tipo: z.string().optional(), status: z.string().optional(),
  evidencia: z.string().optional(), data_realizacao: z.string().optional(),
  participantes: z.string().optional(), canal: z.string().optional(),
  alcance: z.string().optional(), financiador: z.string().optional(),
  valor_aprovado: z.string().optional(), moeda: z.string().optional(),
  validado: z.enum(["Pendente", "Sim", "Não", "Ajuste solicitado"]),
});

const bodySchema = z.object({
  registro: registroSchema,
  isEdit: z.boolean().optional(),
});

// ─── Autenticação Google (JWT RS256 via Web Crypto API) ───────────────────────
async function getAccessToken(): Promise<string> {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não configurado.");

  let sa: { client_email: string; private_key: string };
  try {
    sa = JSON.parse(saJson);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não é um JSON válido.");
  }

  if (!sa.client_email || !sa.private_key) {
    throw new Error("Service Account JSON não contém client_email ou private_key.");
  }

  const now = Math.floor(Date.now() / 1000);

  // Codifica em base64url sem padding
  const b64url = (obj: object) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const header  = b64url({ alg: "RS256", typ: "JWT" });
  const payload = b64url({
    iss:   sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  });

  const signingInput = `${header}.${payload}`;

  // Prepara a chave privada PEM → ArrayBuffer
  const pem = sa.private_key.replace(/\\n/g, "\n");
  const pemBody = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");

  let binaryKey: Uint8Array;
  try {
    binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  } catch {
    throw new Error("Falha ao decodificar a chave privada da Service Account.");
  }

  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey.buffer as ArrayBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
  } catch {
    throw new Error("Falha ao importar a chave privada (formato inválido ou corrompido).");
  }

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signingInput}.${sigB64}`;

  // Troca o JWT por um access token OAuth2
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }),
  });

  // Lê o body como texto primeiro — evita o crash de JSON.parse em HTML de erro
  const tokenText = await tokenRes.text();

  if (!tokenRes.ok) {
    throw new Error(
      `OAuth2 falhou (${tokenRes.status}): ${tokenText.slice(0, 400)}`
    );
  }

  let tokenData: { access_token?: string; error?: string };
  try {
    tokenData = JSON.parse(tokenText);
  } catch {
    throw new Error(`OAuth2 retornou resposta inválida: ${tokenText.slice(0, 200)}`);
  }

  if (!tokenData.access_token) {
    throw new Error(`OAuth2 não retornou access_token. Resposta: ${tokenText.slice(0, 400)}`);
  }

  return tokenData.access_token;
}

// ─── Sheets API helpers ───────────────────────────────────────────────────────
const sheetsBase = (id: string) =>
  `https://sheets.googleapis.com/v4/spreadsheets/${id}`;

/**
 * Retorna os títulos de todas as abas existentes na planilha.
 * Usado para verificar se uma aba precisa ser criada antes de leitura/escrita.
 */
async function getSheetTitles(token: string, spreadsheetId: string): Promise<string[]> {
  const res = await fetch(`${sheetsBase(spreadsheetId)}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`getSheetTitles falhou (${res.status}): ${text.slice(0, 400)}`);
  }
  const data: { sheets?: { properties: { title: string } }[] } = JSON.parse(text);
  return (data.sheets ?? []).map((s) => s.properties.title);
}

/**
 * Cria uma nova aba na planilha via batchUpdate.
 * O Google Sheets API não cria abas automaticamente ao escrever nelas —
 * qualquer range que referencie uma aba inexistente retorna INVALID_ARGUMENT.
 */
async function createSheet(token: string, spreadsheetId: string, title: string): Promise<void> {
  const res = await fetch(`${sheetsBase(spreadsheetId)}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title } } }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    // Ignora erro "already exists" — condição de corrida inofensiva
    if (text.includes("already exists")) return;
    throw new Error(`createSheet("${title}") falhou (${res.status}): ${text.slice(0, 400)}`);
  }
}

/** Lê o valor de uma célula. Retorna "" se vazia ou não existir. */
async function getCell(
  token: string, spreadsheetId: string, tab: string, addr: string
): Promise<string> {
  const range = encodeURIComponent(`'${tab}'!${addr}`);
  const res = await fetch(`${sheetsBase(spreadsheetId)}/values/${range}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`getCell(${tab}!${addr}) falhou (${res.status}): ${text.slice(0, 400)}`);
  }

  let data: { values?: string[][] };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`getCell retornou JSON inválido: ${text.slice(0, 200)}`);
  }

  return data.values?.[0]?.[0] ?? "";
}

/** Sobrescreve o valor de uma célula. */
async function setCell(
  token: string, spreadsheetId: string, tab: string, addr: string, value: string
): Promise<void> {
  const range = encodeURIComponent(`'${tab}'!${addr}`);
  const res = await fetch(
    `${sheetsBase(spreadsheetId)}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [[value]] }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`setCell(${tab}!${addr}) falhou (${res.status}): ${text.slice(0, 400)}`);
  }
}

/** Adiciona uma linha ao final de uma aba. */
async function appendRow(
  token: string, spreadsheetId: string, tab: string, row: string[]
): Promise<void> {
  const range = encodeURIComponent(`'${tab}'!A:Z`);
  const res = await fetch(
    `${sheetsBase(spreadsheetId)}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`appendRow(${tab}) falhou (${res.status}): ${text.slice(0, 400)}`);
  }
}

/**
 * Garante que a aba Tabela2 existe e tem cabeçalhos.
 * Cria a aba via batchUpdate se ela ainda não existir.
 */
async function ensureTabela2(token: string, spreadsheetId: string, existingTitles: string[]): Promise<void> {
  // Cria a aba se necessário
  if (!existingTitles.includes(TAB_TABELA)) {
    console.log(`[annual-actions] Criando aba "${TAB_TABELA}"...`);
    await createSheet(token, spreadsheetId, TAB_TABELA);
  }

  // Verifica se o cabeçalho já foi escrito
  const a1 = await getCell(token, spreadsheetId, TAB_TABELA, "A1");
  if (a1.trim()) return;

  const EQUIPES = [
    "Lilian e Antônio", "Olívia e Gabriel", "Márcio e Malvina",
    "Vagner e Regiane", "Vinícius, Kelson e Victor", "Victor Barbosa",
    "Dorcas e Andressa", "Fábio e Roni", "Ângelo e Anathália",
  ];
  const HEADERS = [
    "Doc. Políticas Públicas", "Publicações Científicas",
    "Cursos / Eventos / Ações", "Projetos Tecnológicos",
    "Alcance Divulgação", "Captação de Recursos",
  ];

  // Usa values:batchUpdate para escrever tudo de uma vez na aba recém-criada
  const res = await fetch(
    `${sheetsBase(spreadsheetId)}/values:batchUpdate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: [
          {
            range: `'${TAB_TABELA}'!A1`,
            values: [
              [`Tabela 2 – Síntese de Indicadores e principais resultados do CIATEN, ${new Date().getFullYear()}`, ...Array(HEADERS.length).fill("")],
              ["Equipe / Núcleo", ...HEADERS],
              ...EQUIPES.map((e) => [e]),
              ["Total"],
            ],
          },
        ],
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ensureTabela2 (escrita) falhou (${res.status}): ${text.slice(0, 400)}`);
  }
}

/**
 * Garante que a aba de log existe e tem cabeçalho.
 * Cria a aba via batchUpdate se ela ainda não existir.
 */
async function ensureLogHeader(token: string, spreadsheetId: string, existingTitles: string[]): Promise<void> {
  // Cria a aba se necessário
  if (!existingTitles.includes(TAB_LOG)) {
    console.log(`[annual-actions] Criando aba "${TAB_LOG}"...`);
    await createSheet(token, spreadsheetId, TAB_LOG);
  }

  // Verifica se o cabeçalho já foi escrito
  const a1 = await getCell(token, spreadsheetId, TAB_LOG, "A1");
  if (a1.trim()) return;

  await appendRow(token, spreadsheetId, TAB_LOG, [
    "ID", "Data/Hora", "Ano", "Equipe", "Indicador (chave)", "Indicador",
    "Nome", "Tipo", "Situação", "Evidência", "Data realização", "Participantes",
    "Canal", "Alcance", "Financiador", "Valor aprovado", "Moeda", "Validado",
  ]);
}

/** Formata o registro como texto multi-linha para a célula da Tabela 2. */
function formatEntrada(r: z.infer<typeof registroSchema>): string {
  const linhas: string[] = [r.nome];
  if (r.tipo)            linhas.push(`Tipo: ${r.tipo}`);
  if (r.status)          linhas.push(`Status: ${r.status}`);
  if (r.evidencia)       linhas.push(`Link: ${r.evidencia}`);
  if (r.data_realizacao) linhas.push(`Data: ${r.data_realizacao}`);
  if (r.participantes)   linhas.push(`Participantes: ${r.participantes}`);
  if (r.canal)           linhas.push(`Canal: ${r.canal}`);
  if (r.alcance)         linhas.push(`Alcance: ${r.alcance}`);
  if (r.financiador)     linhas.push(`Financiador: ${r.financiador}`);
  if (r.valor_aprovado)  linhas.push(`Valor: ${r.valor_aprovado} ${r.moeda ?? "BRL"}`);
  linhas.push(`[${new Date(r.timestamp).toLocaleDateString("pt-BR")} — ID ${r.id}]`);
  return linhas.join("\n");
}

// ─── Handler POST ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Verifica variáveis de ambiente
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    console.error("[annual-actions] GOOGLE_SHEETS_ID não configurado.");
    return NextResponse.json(
      { error: "GOOGLE_SHEETS_ID não configurado no servidor." },
      { status: 503 }
    );
  }
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    console.error("[annual-actions] GOOGLE_SERVICE_ACCOUNT_JSON não configurado.");
    return NextResponse.json(
      { error: "GOOGLE_SERVICE_ACCOUNT_JSON não configurado no servidor." },
      { status: 503 }
    );
  }

  // 2. Valida o body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body da requisição não é JSON válido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { registro } = parsed.data;

  // 3. Executa a integração com Google Sheets
  try {
    console.log(`[annual-actions] Obtendo token para ${registro.equipe} / ${registro.indicador_key}`);
    const token = await getAccessToken();

    console.log("[annual-actions] Token obtido. Lendo abas existentes...");
    const existingTitles = await getSheetTitles(token, spreadsheetId);
    console.log("[annual-actions] Abas encontradas:", existingTitles);

    await ensureTabela2(token, spreadsheetId, existingTitles);
    await ensureLogHeader(token, spreadsheetId, existingTitles);

    // Grava na célula da Tabela 2
    const row = EQUIPE_ROW[registro.equipe];
    const col = INDICADOR_COL[registro.indicador_key];

    if (row && col) {
      const addr = cellAddr(row, col);
      console.log(`[annual-actions] Gravando em Tabela2!${addr}`);
      const existing  = await getCell(token, spreadsheetId, TAB_TABELA, addr);
      const novaEntrada = formatEntrada(registro);
      const novoConteudo = existing.trim()
        ? `${existing}\n\n──────\n${novaEntrada}`
        : novaEntrada;
      await setCell(token, spreadsheetId, TAB_TABELA, addr, novoConteudo);
    } else {
      console.warn(`[annual-actions] Sem mapeamento de célula para equipe="${registro.equipe}" indicador="${registro.indicador_key}"`);
    }

    // Grava no log linear
    console.log("[annual-actions] Gravando no log...");
    await appendRow(token, spreadsheetId, TAB_LOG, [
      registro.id, registro.timestamp, String(registro.ano),
      registro.equipe, registro.indicador_key, registro.indicador,
      registro.nome, registro.tipo ?? "", registro.status ?? "",
      registro.evidencia ?? "", registro.data_realizacao ?? "",
      registro.participantes ?? "", registro.canal ?? "",
      registro.alcance ?? "", registro.financiador ?? "",
      registro.valor_aprovado ?? "", registro.moeda ?? "",
      registro.validado,
    ]);

    console.log("[annual-actions] Sucesso.");
    return NextResponse.json({ success: true }, { status: 201 });

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[annual-actions] Erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
