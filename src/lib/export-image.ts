/**
 * export-image.ts
 *
 * Gera PNG e PDF de tabelas sem afetar o layout do site.
 *
 * Estratégia: em vez de capturar o DOM existente (que tem overflow, min-width,
 * scrollbars etc.), monta um documento HTML auxiliar completo dentro de um
 * <iframe> oculto com estilos controlados, captura esse iframe e destrói.
 */
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

export type TableExportData =
  | { type: "tabela1"; ano: number; rows: Tabela1Row[] }
  | { type: "tabela2"; ano: number; equipes: string[]; cols: ColDef[]; resumo: Record<string, Record<string, number>>; totais: Record<string, number> };

export interface Tabela1Row {
  indicador: string;
  mede: string;
  calculo: string;
  resultado: string;
}

export interface ColDef {
  key: string;
  label: string;
  fmt: (v: number) => string;
}

// ─── Builders de HTML ─────────────────────────────────────────────────────────

function buildHtml(inner: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13pt; color: #1C2B3A;
         background: #fff; padding: 28px; }
  h2 { font-size: 16pt; font-weight: bold; margin-bottom: 6px; }
  .fonte { font-size: 10pt; color: #5A7184; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th { background: #1A4F7A; color: #fff; font-weight: bold; font-size: 11pt;
       padding: 12px 14px; text-align: left; word-wrap: break-word; vertical-align: middle; }
  td { padding: 11px 14px; vertical-align: top; border-bottom: 1px solid #D6E2EE;
       word-wrap: break-word; font-size: 11pt; }
  tr:nth-child(even) td { background: #F5F7FA; }
  .bold  { font-weight: bold; }
  .muted { color: #5A7184; }
  .accent { font-weight: bold; color: #1A4F7A; }
  .total-row td { background: #1A4F7A !important; color: #fff; font-weight: bold; }
  .note { font-size: 10pt; color: #5A7184; margin-top: 12px; }
</style>
</head>
<body>${inner}</body>
</html>`;
}

function htmlTabela1(ano: number, rows: Tabela1Row[]): string {
  const trs = rows.map(r => `
    <tr>
      <td class="bold" style="width:22%">${r.indicador}</td>
      <td class="muted" style="width:30%">${r.mede}</td>
      <td class="muted" style="width:30%">${r.calculo}</td>
      <td class="accent" style="width:18%">${r.resultado}</td>
    </tr>`).join("");

  return buildHtml(`
    <h2>Tabela 1 — Síntese de indicadores e principais resultados do CIATEN, ${ano}</h2>
    <p class="fonte">Fonte: Indicadores Estratégicos para Monitoramento e Avaliação das Ações do CIATEN.
      Calculado automaticamente a partir dos registros <strong>aprovados</strong>.</p>
    <table>
      <thead>
        <tr>
          <th style="width:22%">Indicador</th>
          <th style="width:30%">O que mede</th>
          <th style="width:30%">Como é calculado</th>
          <th style="width:18%">${ano}</th>
        </tr>
      </thead>
      <tbody>${trs}</tbody>
    </table>`);
}

function htmlTabela2(
  ano: number,
  equipes: string[],
  cols: ColDef[],
  resumo: Record<string, Record<string, number>>,
  totais: Record<string, number>
): string {
  const colW = Math.floor(74 / cols.length);
  const ths = cols.map(c => `<th style="width:${colW}%">${c.label}</th>`).join("");
  const trs = equipes.map(eq => {
    const tds = cols.map(c => `<td>${c.fmt(resumo[eq]?.[c.key] ?? 0)}</td>`).join("");
    return `<tr><td class="bold" style="width:26%">${eq}</td>${tds}</tr>`;
  }).join("");
  const totalTds = cols.map(c => `<td>${c.fmt(totais[c.key] ?? 0)}</td>`).join("");

  return buildHtml(`
    <h2>Tabela 2 — Síntese de Indicadores por Núcleo, ${ano}</h2>
    <table>
      <thead>
        <tr>
          <th style="width:26%">Equipe / Núcleo</th>${ths}
        </tr>
      </thead>
      <tbody>
        ${trs}
        <tr class="total-row">
          <td>Total</td>${totalTds}
        </tr>
      </tbody>
    </table>
    <p class="note">* Apenas registros Aprovados são contabilizados.</p>`);
}

// ─── Captura de iframe ────────────────────────────────────────────────────────

async function captureHtml(html: string, scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;border:none;visibility:hidden;";
    iframe.width  = "1200";
    iframe.height = "800";
    document.body.appendChild(iframe);

    iframe.onload = async () => {
      try {
        const doc = iframe.contentDocument!;
        const body = doc.body;

        // Aguarda fontes e layout
        await new Promise(r => setTimeout(r, 300));

        // Expande o iframe para o tamanho real do conteúdo
        const realH = body.scrollHeight;
        const realW = body.scrollWidth;
        iframe.height = String(realH + 48);
        iframe.width  = String(realW);

        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => requestAnimationFrame(r));

        const dataUrl = await toPng(body, {
          cacheBust: true,
          pixelRatio: scale,
          backgroundColor: "#ffffff",
          width: realW,
          height: realH + 48,
        });

        document.body.removeChild(iframe);
        resolve(dataUrl);
      } catch (e) {
        document.body.removeChild(iframe);
        reject(e);
      }
    };

    // Escreve o HTML no iframe
    iframe.srcdoc = html;
  });
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function exportTableAsPng(data: TableExportData, filename: string): Promise<void> {
  const html = data.type === "tabela1"
    ? htmlTabela1(data.ano, data.rows)
    : htmlTabela2(data.ano, data.equipes, data.cols, data.resumo, data.totais);

  const dataUrl = await captureHtml(html, 4); // 4× = alta resolução (~300dpi)
  const a = Object.assign(document.createElement("a"), { href: dataUrl, download: filename });
  a.click();
}

export async function exportTableAsPdf(data: TableExportData, filename: string): Promise<void> {
  const html = data.type === "tabela1"
    ? htmlTabela1(data.ano, data.rows)
    : htmlTabela2(data.ano, data.equipes, data.cols, data.resumo, data.totais);

  const dataUrl = await captureHtml(html, 4); // 4× para PDF também

  const img = new Image();
  await new Promise<void>(r => { img.onload = () => r(); img.src = dataUrl; });

  const pxToMm = (px: number) => (px / 2) * 0.2646;
  const w = pxToMm(img.naturalWidth);
  const h = pxToMm(img.naturalHeight);

  const pdf = new jsPDF({ orientation: w > h ? "landscape" : "portrait", unit: "mm", format: [w, h] });
  pdf.addImage(dataUrl, "PNG", 0, 0, w, h, undefined, "FAST");
  pdf.save(filename);
}