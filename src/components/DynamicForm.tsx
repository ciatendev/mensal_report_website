"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SignatureCanvasWithUpload from "./SignatureCanvasWithUpload";
import RichLinkEditor, { type RichLink } from "./RichLinkEditor";
import { CLS } from "@/styles/tokens";

type QuestionType = "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "SELECT" | "CHECKBOX" | "YES_NO_JUSTIFY";

interface Question {
  id: string;
  /** prdem na criação/edição do modelo. */
  order: number;
  label: string;
  type: QuestionType;
  isRequired: boolean;
  isRepeatable: boolean;
  defaultRowText?: string | null;
  options?: string[] | null;
}

interface TemplateData {
  id: string;
  title: string;
  description?: string | null;
  questions: Question[];
}

interface Props { template: TemplateData }

interface ConditionalRow {
  localId: string;
  description: string;
  status: "SIM" | "NAO" | "";
  justification: string;
  details: string;
  links: RichLink[];
}

interface TextRow { localId: string; text: string }

function newLocalId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyConditionalRow(description = ""): ConditionalRow {
  return { localId: newLocalId(), description, status: "", justification: "", details: "", links: [] };
}

function ConditionalRowEditor({
  row,
  onChange,
  onRemove,
}: {
  row: ConditionalRow;
  onChange: (patch: Partial<ConditionalRow>) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="relative space-y-3 rounded-lg border border-gray-300 bg-white p-4">
      {onRemove && <button type="button" onClick={onRemove} className="absolute right-3 top-2 text-xs text-red-500 hover:underline">Remover</button>}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Descrição da atividade/registro <span className="text-red-500">*</span></label>
        <textarea rows={2} value={row.description} onChange={(event) => onChange({ description: event.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-xs font-medium text-gray-600">Foi realizada? <span className="text-red-500">*</span></span>
        <label className="flex items-center gap-1.5 text-sm"><input type="radio" checked={row.status === "SIM"} onChange={() => onChange({ status: "SIM" })} />Sim</label>
        <label className="flex items-center gap-1.5 text-sm"><input type="radio" checked={row.status === "NAO"} onChange={() => onChange({ status: "NAO" })} />Não</label>
      </div>
      {row.status === "SIM" && <RichLinkEditor details={row.details} links={row.links} onDetailsChange={(details) => onChange({ details })} onLinksChange={(links) => onChange({ links })} />}
      {row.status === "NAO" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Justificativa <span className="text-red-500">*</span></label>
          <textarea rows={2} value={row.justification} onChange={(event) => onChange({ justification: event.target.value })} className="w-full rounded-md border border-red-200 px-3 py-2 text-sm" />
        </div>
      )}
    </div>
  );
}

function DownloadButton({ href, disabled = false }: { href?: string | null; disabled?: boolean }) {
  return (
    <a
      href={href ?? undefined}
      download={Boolean(href)}
      target={href?.startsWith("/api/") ? undefined : "_blank"}
      rel="noreferrer"
      aria-disabled={disabled || !href}
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition ${disabled || !href ? "pointer-events-none bg-gray-200 text-gray-500" : "bg-gray-800 text-white hover:bg-gray-900"}`}
    >
      Baixar Relatório (PDF)
    </a>
  );
}

export default function DynamicForm({ template }: Props) {
  const router = useRouter();
  const orderedQuestions = [...template.questions].sort((a, b) => a.order - b.order);
  const headerQuestions = orderedQuestions.filter((question) => !question.isRepeatable);
  const repeatableQuestions = orderedQuestions.filter((question) => question.isRepeatable);
  const [submittedByName, setSubmittedByName] = useState("");
  const [reportMonth, setReportMonth] = useState("");
  const [headerAnswers, setHeaderAnswers] = useState<Record<string, string>>({});
  const [headerConditionalAnswers, setHeaderConditionalAnswers] = useState<Record<string, ConditionalRow>>(
    Object.fromEntries(headerQuestions.filter((question) => question.type === "YES_NO_JUSTIFY").map((question) => [question.id, emptyConditionalRow()]))
  );
  const [activityRows, setActivityRows] = useState<Record<string, ConditionalRow[]>>(
    Object.fromEntries(repeatableQuestions.filter((question) => question.type === "YES_NO_JUSTIFY").map((question) => [question.id, question.defaultRowText ? [emptyConditionalRow(question.defaultRowText)] : []]))
  );
  const [textRows, setTextRows] = useState<Record<string, TextRow[]>>(
    Object.fromEntries(repeatableQuestions.filter((question) => question.type !== "YES_NO_JUSTIFY").map((question) => [question.id, question.defaultRowText ? [{ localId: newLocalId(), text: question.defaultRowText }] : []]))
  );
  const [signature, setSignature] = useState<{ base64: string | null; source: "DRAWN" | "UPLOADED" | null }>({ base64: null, source: null });
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sendFailure, setSendFailure] = useState<{ submissionId?: string; message: string } | null>(null);
  const [submitResult, setSubmitResult] = useState<{ emailSent: boolean; queued?: boolean; submissionId: string; deliveryError?: string } | null>(null);

  function updateHeaderAnswer(questionId: string, value: string) {
    setHeaderAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function updateHeaderConditional(patch: Partial<ConditionalRow>) {
    setHeaderConditionalAnswers((current) => ({ ...current, [Object.keys(current)[0]]: { ...current[Object.keys(current)[0]], ...patch } }));
  }

  function updateHeaderConditionalById(questionId: string, patch: Partial<ConditionalRow>) {
    setHeaderConditionalAnswers((current) => ({ ...current, [questionId]: { ...current[questionId], ...patch } }));
  }

  function addActivityRow(questionId: string) {
    setActivityRows((current) => ({ ...current, [questionId]: [...(current[questionId] ?? []), emptyConditionalRow()] }));
  }

  function updateActivityRow(questionId: string, localId: string, patch: Partial<ConditionalRow>) {
    setActivityRows((current) => ({ ...current, [questionId]: (current[questionId] ?? []).map((row) => row.localId === localId ? { ...row, ...patch } : row) }));
  }

  function removeActivityRow(questionId: string, localId: string) {
    setActivityRows((current) => ({ ...current, [questionId]: (current[questionId] ?? []).filter((row) => row.localId !== localId) }));
  }

  function addTextRow(questionId: string) {
    setTextRows((current) => ({ ...current, [questionId]: [...(current[questionId] ?? []), { localId: newLocalId(), text: "" }] }));
  }

  function updateTextRow(questionId: string, localId: string, text: string) {
    setTextRows((current) => ({ ...current, [questionId]: (current[questionId] ?? []).map((row) => row.localId === localId ? { ...row, text } : row) }));
  }

  function removeTextRow(questionId: string, localId: string) {
    setTextRows((current) => ({ ...current, [questionId]: (current[questionId] ?? []).filter((row) => row.localId !== localId) }));
  }

  function validateConditional(label: string, row: ConditionalRow) {
    if (!row.description.trim()) return `Preencha a descrição em "${label}".`;
    if (!row.status) return `Informe SIM ou NÃO em "${label}".`;
    if (row.status === "NAO" && !row.justification.trim()) return `A justificativa de "${label}" é obrigatória quando a resposta é NÃO.`;
    if (row.links.some((link) => !link.text.trim() || !/^https?:\/\//i.test(link.url.trim()))) return `Há um link inválido em "${label}".`;
    return null;
  }

  function buildAnswers() {
    const answers: { questionId: string; value: string }[] = [];
    for (const question of orderedQuestions) {
      if (!question.isRepeatable) {
        if (question.type === "YES_NO_JUSTIFY") {
          const row = headerConditionalAnswers[question.id];
          if (row && (row.description.trim() || row.status || row.details.trim() || row.justification.trim() || row.links.length)) {
            answers.push({ questionId: question.id, value: JSON.stringify({ description: row.description, status: row.status, justification: row.justification, details: row.details, links: row.links }) });
          }
        } else if (headerAnswers[question.id]?.trim()) {
          answers.push({ questionId: question.id, value: headerAnswers[question.id] });
        }
        continue;
      }

      if (question.type === "YES_NO_JUSTIFY") {
        for (const row of activityRows[question.id] ?? []) {
          if (row.description.trim() || row.status || row.details.trim() || row.justification.trim() || row.links.length) {
            answers.push({ questionId: question.id, value: JSON.stringify({ description: row.description, status: row.status, justification: row.justification, details: row.details, links: row.links }) });
          }
        }
      } else {
        for (const row of textRows[question.id] ?? []) {
          if (row.text.trim()) answers.push({ questionId: question.id, value: row.text });
        }
      }
    }
    return answers;
  }

  function validateForm() {
    if (submittedByName.trim().length < 2) return "Informe o Nome do Usuário/Responsável manualmente.";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(reportMonth)) return "Informe o Mês de Referência.";
    for (const question of orderedQuestions) {
      if (!question.isRepeatable) {
        if (question.type === "YES_NO_JUSTIFY") {
          const row = headerConditionalAnswers[question.id];
          const hasAny = row && (row.description.trim() || row.status || row.details.trim() || row.justification.trim() || row.links.length);
          if (question.isRequired || hasAny) {
            const error = validateConditional(question.label, row ?? emptyConditionalRow());
            if (error) return error;
          }
        } else if (question.isRequired && !headerAnswers[question.id]?.trim()) {
          return `O campo "${question.label}" é obrigatório.`;
        }
        continue;
      }

      if (question.type === "YES_NO_JUSTIFY") {
        const rows = activityRows[question.id] ?? [];
        if (question.isRequired && rows.length === 0) return `Adicione pelo menos uma linha em "${question.label}".`;
        for (const row of rows) {
          const error = validateConditional(question.label, row);
          if (error) return error;
        }
      } else {
        const rows = textRows[question.id] ?? [];
        if (question.isRequired && rows.length === 0) return `Adicione pelo menos uma linha em "${question.label}".`;
        if (rows.some((row) => !row.text.trim())) return `Preencha o texto de todas as linhas em "${question.label}", ou remova as vazias.`;
      }
    }
    if (!signature.base64 || !signature.source) return "A assinatura é obrigatória para enviar o relatório.";
    return null;
  }

  function requestBody() {
    return {
      templateId: template.id,
      submittedByName: submittedByName.trim(),
      reportMonth,
      answers: buildAnswers(),
      signatureBase64: signature.base64,
      signatureSource: signature.source,
    };
  }

  async function handlePreview(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg(null);
    const validationError = validateForm();
    if (validationError) return setErrorMsg(validationError);
    setPreviewing(true);
    try {
      const response = await fetch("/api/submissions/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody()) });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Não foi possível gerar a pré-visualização.");
      }
      const blob = await response.blob();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Erro inesperado ao gerar a prévia.");
    } finally {
      setPreviewing(false);
    }
  }

  async function sendSubmission() {
    setErrorMsg(null);
    setSendFailure(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody()) });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (data?.submissionId) setSendFailure({ submissionId: data.submissionId, message: data.error ?? "Falha ao enviar o relatório." });
        else setErrorMsg(data?.error ?? "Erro ao enviar o relatório.");
        return;
      }
      setSubmitResult({ emailSent: data?.emailSent ?? true, submissionId: data.submissionId, deliveryError: data?.deliveryError });
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Erro inesperado ao enviar o relatório.");
    } finally {
      setSubmitting(false);
    }
  }

  async function retrySubmission() {
    if (!sendFailure?.submissionId) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/submissions/${sendFailure.submissionId}/retry`, { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) return setSendFailure({ ...sendFailure, message: data?.error ?? "O reenvio falhou." });
      setSendFailure(null);
      setSubmitResult({ emailSent: true, submissionId: sendFailure.submissionId });
    } finally {
      setSubmitting(false);
    }
  }

  async function queueSubmission() {
    if (!sendFailure?.submissionId) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/submissions/${sendFailure.submissionId}/queue`, { method: "POST" });
      const data = await response.json().catch(() => null);
      if (!response.ok) return setSendFailure({ ...sendFailure, message: data?.error ?? "Não foi possível salvar na fila." });
      setSendFailure(null);
      setSubmitResult({ emailSent: false, queued: true, submissionId: sendFailure.submissionId });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitResult) {
    return (
      <div className="mx-auto max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-bold text-gray-900">{submitResult.queued ? "Relatório salvo na fila" : submitResult.emailSent ? "Relatório enviado com sucesso" : "Relatório salvo, mas o e-mail falhou"}</h1>
        <p className="mb-6 text-gray-600">{submitResult.queued ? "O relatório está na aba de relatórios escritos e não enviados. Você poderá tentar novamente quando o serviço estiver disponível." : submitResult.emailSent ? "O PDF foi gerado e enviado por e-mail." : submitResult.deliveryError ?? "O preenchimento foi salvo, mas o envio falhou."}</p>
        <div className="flex flex-col gap-3">
          <DownloadButton href={`/api/submissions/${submitResult.submissionId}/pdf`} />
          <button type="button" onClick={() => router.push("/dashboard?submitted=1")} className="w-full rounded-md bg-primary py-2.5 font-medium text-white hover:bg-primary-dark">Voltar ao painel</button>
        </div>
      </div>
    );
  }

  if (previewUrl) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="rounded-lg border bg-white p-4">
          <h1 className="text-xl font-bold text-gray-900">Confirme seu relatório</h1>
          <p className="mt-1 text-sm text-gray-600">Confira a prévia do PDF. Você pode voltar à edição ou confirmar e enviar.</p>
        </div>
        <iframe title="Pré-visualização do relatório" src={previewUrl} className="h-[75vh] w-full rounded-lg border bg-gray-100" />
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex flex-wrap gap-2">
            <DownloadButton href={previewUrl} />
            <button type="button" onClick={() => router.push("/dashboard")} disabled={submitting} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Sair</button>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPreviewUrl(null)} disabled={submitting} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Voltar para Edição</button>
            <button type="button" onClick={sendSubmission} disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">{submitting ? "Enviando..." : "Confirmar e Enviar"}</button>
          </div>
        </div>
        {sendFailure && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">O envio falhou</p><p className="mt-1">{sendFailure.message}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={retrySubmission} disabled={submitting} className="rounded-md bg-red-700 px-3 py-2 font-medium text-white">Tentar Reenviar Agora</button><button type="button" onClick={queueSubmission} disabled={submitting} className="rounded-md border border-red-300 bg-white px-3 py-2 font-medium text-red-700">Salvar na Fila de Espera</button>{sendFailure.submissionId && <DownloadButton href={`/api/submissions/${sendFailure.submissionId}/pdf`} />}</div></div>}
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-3xl">
      {(submitting || previewing) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"><div className="rounded-xl border bg-white px-8 py-6 text-center shadow-lg"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary" /><p className="font-medium text-gray-800">{previewing ? "Gerando pré-visualização..." : "Gerando e enviando o PDF..."}</p></div></div>}
      <form onSubmit={handlePreview} className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div><h1 className="text-2xl font-bold text-gray-900">{template.title}</h1>{template.description && <p className="mt-1 text-gray-600">{template.description}</p>}</div>
          <button type="button" onClick={() => router.push("/dashboard")} className="shrink-0 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Sair</button>
        </div>

        <section className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-gray-700">Nome do Bolsista<span className="text-red-500">*</span></label><input value={submittedByName} onChange={(event) => setSubmittedByName(event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Digite o nome do responsável" /></div>
          <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Mês de Referência <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={reportMonth ? `${reportMonth}-01` : ""}
            onChange={(e) => {
              const raw = e.target.value; // "YYYY-MM-DD" ou ""
              setReportMonth(raw ? raw.slice(0, 7) : ""); // → "YYYY-MM"
            }}
            required
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
          />
        </div>
          {orderedQuestions.map((question) => {
            if (!question.isRepeatable) {
              return (
                <div key={question.id}>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{question.label}{question.isRequired && <span className="text-red-500"> *</span>}</label>
                  {question.type === "YES_NO_JUSTIFY" ? <ConditionalRowEditor row={headerConditionalAnswers[question.id] ?? emptyConditionalRow()} onChange={(patch) => updateHeaderConditionalById(question.id, patch)} /> : question.type === "SELECT" ? <select value={headerAnswers[question.id] ?? ""} onChange={(event) => updateHeaderAnswer(question.id, event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2"><option value="">Selecione...</option>{(question.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}</select> : question.type === "CHECKBOX" ? <div className="flex flex-wrap gap-3">{(question.options ?? []).map((option) => { const selected = (headerAnswers[question.id] ?? "").split(",").filter(Boolean); return <label key={option} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={selected.includes(option)} onChange={(event) => updateHeaderAnswer(question.id, event.target.checked ? [...selected, option].join(",") : selected.filter((value) => value !== option).join(","))} />{option}</label>; })}</div> : question.type === "TEXTAREA" ? <textarea rows={3} value={headerAnswers[question.id] ?? ""} onChange={(event) => updateHeaderAnswer(question.id, event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2" /> : <input type={question.type === "NUMBER" ? "number" : question.type === "DATE" ? "date" : "text"} value={headerAnswers[question.id] ?? ""} onChange={(event) => updateHeaderAnswer(question.id, event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2" />}
                </div>
              );
            }

            if (question.type === "YES_NO_JUSTIFY") {
              return (
                <section key={question.id} className="space-y-3"><h2 className="text-base font-semibold text-gray-800">{question.label}{question.isRequired && <span className="text-red-500"> *</span>}</h2>{(activityRows[question.id] ?? []).map((row) => <ConditionalRowEditor key={row.localId} row={row} onChange={(patch) => updateActivityRow(question.id, row.localId, patch)} onRemove={() => removeActivityRow(question.id, row.localId)} />)}<button type="button" onClick={() => addActivityRow(question.id)} className="w-full rounded-lg border-2 border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500 hover:border-primary hover:text-primary">+ Adicionar atividade</button></section>
              );
            }

            return (
              <section key={question.id} className="space-y-3"><h2 className="text-base font-semibold text-gray-800">{question.label}{question.isRequired && <span className="text-red-500"> *</span>}</h2>{(textRows[question.id] ?? []).map((row) => <div key={row.localId} className="relative rounded-lg border border-gray-300 bg-white p-3"><button type="button" onClick={() => removeTextRow(question.id, row.localId)} className="absolute right-3 top-2 text-xs text-red-500 hover:underline">Remover</button><textarea rows={3} value={row.text} onChange={(event) => updateTextRow(question.id, row.localId, event.target.value)} className="mt-4 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" /></div>)}<button type="button" onClick={() => addTextRow(question.id)} className="w-full rounded-lg border-2 border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500 hover:border-primary hover:text-primary">+ Adicionar item</button></section>
            );
          })}
        </section>

        <div><label className="mb-2 block text-sm font-medium text-gray-700">Assinatura <span className="text-red-500">*</span></label><SignatureCanvasWithUpload onChange={(base64, source) => setSignature({ base64, source })} /></div>
        {errorMsg && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>}
        <button type="submit" disabled={previewing || submitting} className="w-full rounded-md bg-primary py-2.5 font-medium text-white transition hover:bg-primary-dark disabled:opacity-50">{previewing ? "Gerando pré-visualização..." : "Pré-visualizar Relatório"}</button>
      </form>
      <div className="sticky bottom-4 z-10 mt-4 flex justify-end rounded-lg border bg-white/95 p-3 shadow-lg backdrop-blur"><DownloadButton disabled /></div>
    </div>
  );
}
