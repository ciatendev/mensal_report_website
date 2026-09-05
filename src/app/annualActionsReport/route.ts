import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ─── Schema de validação ────────────────────────────────────────────────────
const registroSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  ano: z.number(),
  equipe: z.string().min(1, "Equipe obrigatória"),
  indicador_key: z.string().min(1, "Indicador obrigatório"),
  indicador: z.string(),
  nome: z.string().min(1, "Nome obrigatório"),
  tipo: z.string().optional(),
  status: z.string().optional(),
  evidencia: z.string().url("Evidência deve ser uma URL válida").optional().or(z.literal("")),
  data_realizacao: z.string().optional(),
  participantes: z.string().optional(),
  canal: z.string().optional(),
  alcance: z.string().optional(),
  financiador: z.string().optional(),
  valor_aprovado: z.string().optional(),
  moeda: z.string().optional(),
  validado: z.enum(["Pendente", "Sim", "Não", "Ajuste solicitado"]),
});

// ─── Colunas que serão escritas na planilha (ordem importa) ─────────────────
const SHEET_COLUMNS = [
  "id", "timestamp", "ano", "equipe",
  "indicador_key", "indicador", "nome", "tipo", "status",
  "evidencia", "data_realizacao", "participantes",
  "canal", "alcance", "financiador", "valor_aprovado", "moeda",
  "validado",
];

// ─── Cabeçalhos legíveis para a primeira linha da aba ───────────────────────
const SHEET_HEADERS = [
  "ID", "Data/Hora", "Ano", "Equipe",
  "Indicador (chave)", "Indicador", "Nome do produto/atividade",
  "Tipo", "Situação", "Evidência/link",
  "Data de realização", "Participantes",
  "Canal", "Alcance", "Financiador", "Valor aprovado", "Moeda",
  "Validado",
];

// ─── Utilitário: obtém token de acesso via Service Account ──────────────────
async function getAccessToken(): Promise<string> {
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  // Assina o JWT com RS256 usando a chave privada da Service Account
  const encoder = new TextEncoder();
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const body = btoa(JSON.stringify(payload))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signingInput = `${header}.${body}`;

  // Importa a chave privada PEM
  const pemKey = serviceAccount.private_key.replace(/\\n/g, "\n");
  const pemBody = pemKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signingInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${signingInput}.${signatureB64}`;

  // Troca o JWT por um access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Falha ao obter token Google: ${err}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token as string;
}

// ─── Verifica se o cabeçalho já existe na planilha ──────────────────────────
async function ensureHeader(
  token: string,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  const range = encodeURIComponent(`${sheetName}!A1:R1`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = await res.json();
  const hasHeader = data.values && data.values[0]?.length > 0;

  if (!hasHeader) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [SHEET_HEADERS] }),
      }
    );
  }
}

// ─── Adiciona uma linha ao final da aba ─────────────────────────────────────
async function appendRow(
  token: string,
  spreadsheetId: string,
  sheetName: string,
  registro: z.infer<typeof registroSchema>
): Promise<void> {
  const row = SHEET_COLUMNS.map((col) =>
    String((registro as Record<string, unknown>)[col] ?? "")
  );

  const range = encodeURIComponent(`${sheetName}!A:R`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Falha ao gravar na planilha: ${err}`);
  }
}

// ─── Handler principal ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Valida as variáveis de ambiente obrigatórias
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    const sheetName = process.env.GOOGLE_SHEETS_TAB_NAME ?? "Registros";

    if (!spreadsheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      console.error("[annual-actions] Variáveis de ambiente não configuradas.");
      return NextResponse.json(
        { error: "Integração com Google Sheets não configurada no servidor." },
        { status: 503 }
      );
    }

    // Valida o corpo da requisição
    const body = await req.json();
    const parsed = registroSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Autenticação e escrita
    const token = await getAccessToken();
    await ensureHeader(token, spreadsheetId, sheetName);
    await appendRow(token, spreadsheetId, sheetName, parsed.data);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/annual-actions] Erro:", error);
    return NextResponse.json(
      { error: "Erro interno ao salvar o registro." },
      { status: 500 }
    );
  }
}
