/**
 * sheets-helpers.ts — Funções compartilhadas para Google Sheets API.
 * Usadas por /api/annual-actions/records/[id] e /api/annual-actions/export.
 *
 * Nomes canônicos das abas (com espaço, conforme exibido no Google Sheets):
 *   "Tabela 1", "Tabela 2", "Registros"
 */

export const TAB_T1  = "Tabela 1";
export const TAB_T2  = "Tabela 2";
export const TAB_LOG = "Registros";

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function getGoogleToken(): Promise<string> {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não configurado.");
  let sa: { client_email: string; private_key: string };
  try { sa = JSON.parse(saJson); } catch { throw new Error("Service Account JSON inválido."); }

  const now = Math.floor(Date.now() / 1000);
  const b64u = (o: object) =>
    btoa(JSON.stringify(o)).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");

  const hdr = b64u({ alg: "RS256", typ: "JWT" });
  const pld = b64u({
    iss:   sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  });
  const si = `${hdr}.${pld}`;

  const pem = sa.private_key.replace(/\\n/g, "\n");
  const pb  = pem.replace(/-----BEGIN PRIVATE KEY-----/g,"").replace(/-----END PRIVATE KEY-----/g,"").replace(/\s+/g,"");
  const bk  = Uint8Array.from(atob(pb), (c) => c.charCodeAt(0));
  const ck  = await crypto.subtle.importKey("pkcs8", bk.buffer as ArrayBuffer, { name:"RSASSA-PKCS1-v1_5", hash:"SHA-256" }, false, ["sign"]);
  const sg  = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", ck, new TextEncoder().encode(si));
  const sb  = btoa(String.fromCharCode(...new Uint8Array(sg))).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");

  const jwt = `${si}.${sb}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`OAuth2 (${res.status}): ${txt.slice(0, 300)}`);
  const d = JSON.parse(txt);
  if (!d.access_token) throw new Error("Sem access_token.");
  return d.access_token as string;
}

// ─── Sheets API base ──────────────────────────────────────────────────────────
export const SB = (id: string) => `https://sheets.googleapis.com/v4/spreadsheets/${id}`;

export async function shGet(t: string, id: string, tab: string, addr: string): Promise<string> {
  const res = await fetch(`${SB(id)}/values/${encodeURIComponent(`'${tab}'!${addr}`)}`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`shGet ${tab}!${addr} (${res.status}): ${txt.slice(0,200)}`);
  return JSON.parse(txt).values?.[0]?.[0] ?? "";
}

export async function shSet(t: string, id: string, tab: string, addr: string, val: string): Promise<void> {
  const res = await fetch(
    `${SB(id)}/values/${encodeURIComponent(`'${tab}'!${addr}`)}?valueInputOption=USER_ENTERED`,
    { method: "PUT", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ values: [[val]] }) }
  );
  if (!res.ok) { const txt = await res.text(); throw new Error(`shSet ${tab}!${addr} (${res.status}): ${txt.slice(0,200)}`); }
}

export async function shAppend(t: string, id: string, tab: string, row: string[]): Promise<void> {
  const res = await fetch(
    `${SB(id)}/values/${encodeURIComponent(`'${tab}'!A:Z`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ values: [row] }) }
  );
  if (!res.ok) { const txt = await res.text(); throw new Error(`shAppend ${tab} (${res.status}): ${txt.slice(0,200)}`); }
}

export interface SheetInfo { title: string; sheetId: number; }

export async function getSheets(t: string, id: string): Promise<SheetInfo[]> {
  const res = await fetch(`${SB(id)}?fields=sheets(properties)`, { headers: { Authorization: `Bearer ${t}` } });
  const txt = await res.text();
  if (!res.ok) throw new Error(`getSheets (${res.status}): ${txt.slice(0,200)}`);
  const d: { sheets?: { properties: { title: string; sheetId: number } }[] } = JSON.parse(txt);
  return (d.sheets ?? []).map(s => ({ title: s.properties.title, sheetId: s.properties.sheetId }));
}

export async function ensureSheet(t: string, id: string, title: string): Promise<number> {
  const sheets = await getSheets(t, id);
  const existing = sheets.find(s => s.title === title);
  if (existing) return existing.sheetId;

  const res = await fetch(`${SB(id)}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  });
  if (!res.ok) { const txt = await res.text(); throw new Error(`ensureSheet "${title}" (${res.status}): ${txt.slice(0,200)}`); }
  const d = await res.json();
  return d.replies?.[0]?.addSheet?.properties?.sheetId ?? 0;
}

/** Deleta a aba se existir, cria nova com o mesmo nome. Retorna o novo sheetId. */
export async function recreateSheet(t: string, id: string, title: string): Promise<number> {
  const sheets = await getSheets(t, id);
  const existing = sheets.find(s => s.title === title);

  // Se for a única aba, cria uma temporária primeiro
  if (existing && sheets.length === 1) {
    await fetch(`${SB(id)}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: "__tmp__" } } }] }),
    });
  }

  const requests: object[] = [];
  if (existing) requests.push({ deleteSheet: { sheetId: existing.sheetId } });
  requests.push({ addSheet: { properties: { title } } });

  const res = await fetch(`${SB(id)}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) { const txt = await res.text(); throw new Error(`recreateSheet "${title}" (${res.status}): ${txt.slice(0,300)}`); }

  // Remove __tmp__ se foi criada
  if (existing && sheets.length === 1) {
    const sheetsNow = await getSheets(t, id);
    const tmp = sheetsNow.find(s => s.title === "__tmp__");
    if (tmp) {
      await fetch(`${SB(id)}:batchUpdate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requests: [{ deleteSheet: { sheetId: tmp.sheetId } }] }),
      });
    }
  }

  const sheetsAfter = await getSheets(t, id);
  return sheetsAfter.find(s => s.title === title)?.sheetId ?? 0;
}

/** Escreve dados na aba (sobrescreve a partir de A1). */
export async function writeToSheet(t: string, id: string, tab: string, values: string[][]): Promise<void> {
  const res = await fetch(
    `${SB(id)}/values/${encodeURIComponent(`'${tab}'!A1`)}?valueInputOption=USER_ENTERED`,
    { method: "PUT", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" }, body: JSON.stringify({ values }) }
  );
  if (!res.ok) { const txt = await res.text(); throw new Error(`writeToSheet "${tab}" (${res.status}): ${txt.slice(0,300)}`); }
}

/**
 * Aplica formatação completa em uma aba:
 *  - Merge da linha do título (linha 1, colunas A–G)
 *  - Título: negrito, fonte 13, fundo azul CIATEN
 *  - Cabeçalho das colunas: negrito, branco, fundo azul
 *  - Wrap text em toda a planilha
 *  - Largura de coluna generosa para caber o texto
 */
export async function formatSheet(
  t: string,
  id: string,
  sheetId: number,
  opts: {
    titleRow: number;       // 0-indexed, linha do título
    headerRow: number;      // 0-indexed, linha do cabeçalho de colunas
    numCols: number;        // quantas colunas tem a tabela
    colWidths?: number[];   // largura em pixels por coluna (opcional)
  }
): Promise<void> {
  const { titleRow, headerRow, numCols, colWidths } = opts;
  const BLUE = { red: 0.102, green: 0.310, blue: 0.478 }; // #1A4F7A
  const WHITE = { red: 1, green: 1, blue: 1 };

  const requests: object[] = [
    // 1. Wrap text em toda a planilha
    {
      repeatCell: {
        range: { sheetId },
        cell: { userEnteredFormat: { wrapStrategy: "WRAP" } },
        fields: "userEnteredFormat.wrapStrategy",
      },
    },
    // 2. Merge da linha do título (A até última coluna)
    {
      mergeCells: {
        range: { sheetId, startRowIndex: titleRow, endRowIndex: titleRow + 1, startColumnIndex: 0, endColumnIndex: numCols },
        mergeType: "MERGE_ALL",
      },
    },
    // 3. Formata a célula do título: azul escuro, texto branco, negrito, fonte 13
    {
      repeatCell: {
        range: { sheetId, startRowIndex: titleRow, endRowIndex: titleRow + 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: BLUE,
            textFormat: { bold: true, fontSize: 13, foregroundColor: WHITE },
            horizontalAlignment: "LEFT",
            verticalAlignment: "MIDDLE",
            wrapStrategy: "WRAP",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)",
      },
    },
    // 4. Formata o cabeçalho de colunas: azul, texto branco, negrito
    {
      repeatCell: {
        range: { sheetId, startRowIndex: headerRow, endRowIndex: headerRow + 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: BLUE,
            textFormat: { bold: true, foregroundColor: WHITE },
            wrapStrategy: "WRAP",
            verticalAlignment: "MIDDLE",
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat,wrapStrategy,verticalAlignment)",
      },
    },
    // 5. Linhas de dados: alternância de cor (branco e cinza claro)
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: headerRow + 1, startColumnIndex: 0, endColumnIndex: numCols }],
          booleanRule: {
            condition: { type: "CUSTOM_FORMULA", values: [{ userEnteredValue: `=MOD(ROW(),2)=0` }] },
            format: { backgroundColor: { red: 0.957, green: 0.969, blue: 0.980 } }, // #F5F7FA
          },
        },
        index: 0,
      },
    },
  ];

  // 6. Larguras de coluna
  if (colWidths && colWidths.length > 0) {
    colWidths.forEach((px, i) => {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
          properties: { pixelSize: px },
          fields: "pixelSize",
        },
      });
    });
  }

  // 7. Altura da linha do título
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: "ROWS", startIndex: titleRow, endIndex: titleRow + 1 },
      properties: { pixelSize: 48 },
      fields: "pixelSize",
    },
  });
  // 8. Altura do cabeçalho
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: "ROWS", startIndex: headerRow, endIndex: headerRow + 1 },
      properties: { pixelSize: 80 },
      fields: "pixelSize",
    },
  });

  await fetch(`${SB(id)}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  }).catch((e) => console.error("[formatSheet] falhou:", e));
}
