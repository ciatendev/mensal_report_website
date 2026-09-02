"use client";

import { useEffect, useState } from "react";

interface PendingReport {
  id: string;
  submittedByName: string;
  createdAt: string;
  deliveryStatus: "FAILED" | "QUEUED" | "PENDING";
  deliveryAttempts: number;
  lastDeliveryError?: string | null;
  queuedAt?: string | null;
  template: { title: string };
}

const statusLabel: Record<PendingReport["deliveryStatus"], string> = {
  FAILED: "Falha no envio",
  QUEUED: "Na fila de espera",
  PENDING: "Aguardando processamento",
};

export default function PendingReportsPanel() {
  const [reports, setReports] = useState<PendingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/submissions/pending", { cache: "no-store" });
      if (response.ok) setReports(await response.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function retry(id: string) {
    setRetrying(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/submissions/${id}/retry`, { method: "POST" });
      const data = await response.json().catch(() => null);
      setMessage(response.ok ? "Relatório reenviado com sucesso." : data?.error ?? "O reenvio falhou.");
      await load();
    } finally {
      setRetrying(null);
    }
  }

  return (
    <section className="mt-10 rounded-lg border bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-gray-900">Relatórios escritos e não enviados</h2>
          <p className="text-sm text-gray-500">Preenchimentos preservados quando o envio de e-mail falhou.</p>
        </div>
        <button type="button" onClick={load} className="text-sm font-medium text-primary hover:underline">Atualizar</button>
      </div>
      {message && <p className="mb-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{message}</p>}
      {loading ? <p className="text-sm text-gray-500">Carregando...</p> : reports.length === 0 ? <p className="text-sm text-gray-500">Nenhum relatório pendente.</p> : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{report.template.title}</p>
                  <p className="text-xs text-gray-600">Responsável: {report.submittedByName} · {new Date(report.createdAt).toLocaleString("pt-BR")}</p>
                  <p className="mt-1 text-xs font-medium text-amber-800">{statusLabel[report.deliveryStatus]} · tentativas: {report.deliveryAttempts}</p>
                  {report.lastDeliveryError && <p className="mt-1 text-xs text-red-700">{report.lastDeliveryError}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={`/api/submissions/${report.id}/pdf`} download className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Baixar PDF</a>
                  <button type="button" onClick={() => retry(report.id)} disabled={retrying === report.id} className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-50">{retrying === report.id ? "Reenviando..." : "Tentar Reenviar"}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
