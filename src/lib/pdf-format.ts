export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderRichText(value: string | null | undefined) {
  if (!value) return "";
  const markdownLink = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi;
  const bareUrl = /(https?:\/\/[^\s<]+)/gi;
  let html = "";
  let cursor = 0;

  for (const match of [...value.matchAll(markdownLink)]) {
    const start = match.index ?? 0;
    if (start < cursor) continue;
    html += escapeHtml(value.slice(cursor, start)).replaceAll("\n", "<br />");
    html += `<a href="${escapeHtml(match[2])}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[1])}</a>`;
    cursor = start + match[0].length;
  }

  html += escapeHtml(value.slice(cursor)).replace(bareUrl, (match) => {
    const safeUrl = match.replace(/[),.;]+$/, "");
    const suffix = match.slice(safeUrl.length);
    return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(safeUrl)}</a>${escapeHtml(suffix)}`;
  });

  return html.replaceAll("\n", "<br />");
}

export function styleCss(question: {
  fontSize?: number | null;
  isBold?: boolean;
  isItalic?: boolean;
}) {
  const fontSize = Math.min(32, Math.max(8, question.fontSize || 11));
  return `font-size:${fontSize}pt;font-weight:${question.isBold ? "700" : "400"};font-style:${question.isItalic ? "italic" : "normal"};`;
}
