/**
 * /api/annual-actions/tabela1 — Grava/atualiza a Tabela 1 (síntese consolidada)
 * no Google Sheets.
 *
 * Estratégia: sobrescreve a aba "Tabela1" inteira a cada chamada.
 * A Tabela 1 é calculada no cliente (totais já validados) e enviada pronta —
 * o servidor apenas autentica e escreve no Sheets.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const TAB_TABELA1 = process.env.GOOGLE_SHEETS_TAB_TABELA1 ?? "Tabela1";

// ─── Validação ────────────────────────────────────────────────────────────────
const rowSchema = z.object({
  indicador: z.string(),
  mede:      z.string(),
  calculo:   z.string(),
  resultado: z.string(),
  ano:       z.string(),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(20),
  ano:  z.number().int().min(2020).max(2099),
});

// ─── Auth Google (reutiliza a mesma lógica da route principal) ────────────────
async function getAccessToken(): Promise<string> {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não configurado.");

  let sa: { client_email: string; private_key: string };
  try { sa = JSON.parse(saJson); } catch { throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não é JSON válido."); }
  if (!sa.client_email || !sa.private_key) throw new Error("Service Account sem client_email ou private_key.");

  const now = Math.floor(Date.now() / 1000);
  const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  const header  = b64url({ alg: "RS256", typ: "JWT" });
  const payload = b64url({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const si = `${header}.${payload}`;

  const pem = sa.private_key.replace(/\\n/g, "\n");
  const pemBody = pem.replace(/-----BEGIN PRIVATE KEY-----/g,"").replace(/-----END PRIVATE KEY-----/g,"").replace(/\s+/g,"");
  const binKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const ck = await crypto.subtle.importKey("pkcs8", binKey.buffer as ArrayBuffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", ck, new TextEncoder().encode(si));
  const sb64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
  const jwt = `${si}.${sb64}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OAuth2 falhou (${res.status}): ${text.slice(0, 400)}`);
  const data = JSON.parse(text);
  if (!data.access_token) throw new Error(`Sem access_token: ${text.slice(0, 400)}`);
  return data.access_token as string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sheetsBase = (id: string) => `https://sheets.googleapis.com/v4/spreadsheets/${id}`;

async function getSheetTitles(token: string, id: string): Promise<string[]> {
  const res = await fetch(`${sheetsBase(id)}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`getSheetTitles falhou (${res.status}): ${text.slice(0, 400)}`);
  const data: { sheets?: { properties: { title: string } }[] } = JSON.parse(text);
  return (data.sheets ?? []).map((s) => s.properties.title);
}

async function createSheet(token: string, id: string, title: string): Promise<void> {
  const res = await fetch(`${sheetsBase(id)}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (text.includes("already exists")) return;
    throw new Error(`createSheet("${title}") falhou (${res.status}): ${text.slice(0, 400)}`);
  }
}

/**
 * Limpa toda a aba e reescreve do zero.
 * Usa values:batchUpdate com OVERWRITE para garantir que linhas antigas sejam
 * substituídas mesmo se o número de linhas mudar entre chamadas.
 */
async function clearAndWrite(
  token: string,
  spreadsheetId: string,
  tab: string,
  values: string[][]
): Promise<void> {
  // 1. Limpa a aba inteira
  const clearRange = encodeURIComponent(`'${tab}'!A:Z`);
  const clearRes = await fetch(
    `${sheetsBase(spreadsheetId)}/values/${clearRange}:clear`,
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  if (!clearRes.ok) {
    const text = await clearRes.text();
    throw new Error(`clear("${tab}") falhou (${clearRes.status}): ${text.slice(0, 400)}`);
  }

  // 2. Escreve os novos dados
  const writeRange = encodeURIComponent(`'${tab}'!A1`);
  const writeRes = await fetch(
    `${sheetsBase(spreadsheetId)}/values/${writeRange}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    }
  );
  if (!writeRes.ok) {
    const text = await writeRes.text();
    throw new Error(`write("${tab}") falhou (${writeRes.status}): ${text.slice(0, 400)}`);
  }
}

// ─── Handler POST ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return NextResponse.json({ error: "Google Sheets não configurado no servidor." }, { status: 503 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body não é JSON válido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { rows, ano } = parsed.data;

  try {
    console.log(`[tabela1] Obtendo token...`);
    const token = await getAccessToken();

    // Garante que a aba existe
    const titles = await getSheetTitles(token, spreadsheetId);
    if (!titles.includes(TAB_TABELA1)) {
      console.log(`[tabela1] Criando aba "${TAB_TABELA1}"...`);
      await createSheet(token, spreadsheetId, TAB_TABELA1);
    }

    // Monta os dados: título + cabeçalho + linhas de dados
    const sheetData: string[][] = [
      // Linha 1: título
      [`Tabela 1 – Síntese de indicadores e principais resultados do CIATEN, ${ano}`, "", "", ""],
      // Linha 2: fonte
      [`Fonte: Indicadores Estratégicos para Monitoramento e Avaliação das Ações do CIATEN`, "", "", ""],
      // Linha 3: em branco
      ["", "", "", ""],
      // Linha 4: cabeçalho das colunas
      ["Indicador", "O que mede", "Como é calculado", String(ano)],
      // Linhas 5+: dados
      ...rows.map((r) => [r.indicador, r.mede, r.calculo, r.resultado]),
    ];

    console.log(`[tabela1] Escrevendo ${rows.length} linhas na aba "${TAB_TABELA1}"...`);
    await clearAndWrite(token, spreadsheetId, TAB_TABELA1, sheetData);

    console.log("[tabela1] Sucesso.");
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[tabela1] Erro:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
