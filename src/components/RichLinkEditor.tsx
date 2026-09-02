"use client";

import { useState } from "react";

export interface RichLink {
  text: string;
  url: string;
}

interface Props {
  details: string;
  links: RichLink[];
  onDetailsChange: (value: string) => void;
  onLinksChange: (links: RichLink[]) => void;
}

export default function RichLinkEditor({ details, links, onDetailsChange, onLinksChange }: Props) {
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);

  function addLink() {
    if (!linkText.trim() || !linkUrl.trim()) {
      setLinkError("Informe o texto de exibição e a URL.");
      return;
    }
    if (!/^https?:\/\//i.test(linkUrl.trim())) {
      setLinkError("A URL deve começar com http:// ou https://.");
      return;
    }
    onLinksChange([...links, { text: linkText.trim(), url: linkUrl.trim() }]);
    setLinkText("");
    setLinkUrl("");
    setLinkError(null);
  }

  return (
    <div className="space-y-2 rounded-md border border-emerald-100 bg-emerald-50 p-3">
      <label className="block text-xs font-medium text-emerald-900">Adendo, detalhes ou observações (opcional)</label>
      <textarea rows={2} value={details} onChange={(event) => onDetailsChange(event.target.value)} className="w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm" placeholder="Descreva detalhes adicionais..." />
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input value={linkText} onChange={(event) => setLinkText(event.target.value)} placeholder="Texto do link" className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm" />
        <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://destino..." className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm" />
        <button type="button" onClick={addLink} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800">Inserir link</button>
      </div>
      {linkError && <p className="text-xs text-red-600">{linkError}</p>}
      {links.length > 0 && (
        <ul className="space-y-1 text-xs text-emerald-900">
          {links.map((link, index) => (
            <li key={`${link.url}-${index}`} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1">
              <span className="truncate">[{link.text}]({link.url})</span>
              <button type="button" onClick={() => onLinksChange(links.filter((_, current) => current !== index))} className="shrink-0 text-red-600 hover:underline">Remover</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
