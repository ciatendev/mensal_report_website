"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import QuestionOptionsEditor from "@/components/QuestionOptionsEditor";
import QuestionStyleControls from "@/components/QuestionStyleControls";

type QuestionType = "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "SELECT" | "CHECKBOX" | "YES_NO_JUSTIFY";

interface DraftQuestion {
  id?: string;
  label: string;
  type: QuestionType;
  isRequired: boolean;
  isRepeatable: boolean;
  defaultRowText: string;
  options: string[];
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
}

const emptyQuestion: DraftQuestion = {
  label: "",
  type: "TEXT",
  isRequired: true,
  isRepeatable: false,
  defaultRowText: "",
  options: [],
  fontSize: 11,
  isBold: false,
  isItalic: false,
};

function mapQuestion(question: any): DraftQuestion {
  return {
    id: question.id,
    label: question.label,
    type: question.type,
    isRequired: question.isRequired,
    isRepeatable: question.isRepeatable,
    defaultRowText: question.defaultRowText ?? "",
    options: Array.isArray(question.options) ? question.options.filter((option: unknown): option is string => typeof option === "string") : [],
    fontSize: Number(question.fontSize ?? 11),
    isBold: Boolean(question.isBold),
    isItalic: Boolean(question.isItalic),
  };
}

export default function EditTemplatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/templates/${params.id}`);
        if (!response.ok) throw new Error("Não foi possível carregar este modelo.");
        const data = await response.json();
        setTitle(data.title);
        setDescription(data.description ?? "");
        setQuestions(data.questions.map(mapQuestion));
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : "Erro ao carregar o modelo.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question, i) => i === index ? { ...question, ...patch } : question));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    if (!title.trim()) return setErrorMsg("Informe um título para o modelo.");
    if (questions.length === 0) return setErrorMsg("O modelo precisa ter pelo menos uma pergunta.");
    if (questions.some((question) => !question.label.trim())) return setErrorMsg("Todas as perguntas precisam de um rótulo.");
    const invalidSelect = questions.find((question) => question.type === "SELECT" && question.options.filter((option) => option.trim()).length === 0);
    if (invalidSelect) return setErrorMsg(`Adicione ao menos uma opção para "${invalidSelect.label}".`);

    setSaving(true);
    try {
      const templateResponse = await fetch(`/api/templates/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      });
      const templateData = await templateResponse.json().catch(() => null);
      if (!templateResponse.ok) throw new Error(templateData?.error ?? "Erro ao salvar título/descrição.");

      const questionResponse = await fetch(`/api/templates/${params.id}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: questions.map((question, index) => ({
            id: question.id,
            label: question.label.trim(),
            type: question.type,
            isRequired: question.isRequired,
            isRepeatable: question.isRepeatable,
            defaultRowText: question.isRepeatable ? question.defaultRowText.trim() || undefined : undefined,
            order: index,
            options: question.type === "SELECT" || question.type === "CHECKBOX" ? question.options.map((option) => option.trim()).filter(Boolean) : undefined,
            fontSize: question.fontSize,
            isBold: question.isBold,
            isItalic: question.isItalic,
          })),
        }),
      });
      const questionData = await questionResponse.json().catch(() => null);
      if (!questionResponse.ok) throw new Error(questionData?.error ?? "Erro ao salvar as perguntas.");

      if (questionData.skipped?.length > 0) {
        setInfoMsg(`Modelo salvo. ${questionData.skipped.length} pergunta(s) não foram removidas por já terem respostas antigas.`);
        setQuestions(questionData.template.questions.map(mapQuestion));
      } else {
        router.push("/admin/templates");
      }
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmingDelete) return setConfirmingDelete(true);
    setDeleting(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/templates/${params.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.deleted) return router.push("/admin/templates");
      if (data?.deactivated) {
        setInfoMsg(data.error ?? "Modelo desativado para preservar o histórico.");
        setConfirmingDelete(false);
        return;
      }
      throw new Error(data?.error ?? "Erro ao excluir o modelo.");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Erro inesperado.");
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <p className="py-10 text-center text-sm text-gray-500">Carregando...</p>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Editar Modelo</h1>
        <Link href="/admin/templates" className="text-sm text-gray-500 hover:underline">Voltar</Link>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <input className="w-full rounded-md border border-gray-300 px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título" />
        <textarea className="w-full rounded-md border border-gray-300 px-3 py-2" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descrição (opcional)" />

        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800">Perguntas</h2>
          {questions.map((question, index) => (
            <div key={question.id ?? `new-${index}`} className="space-y-3 rounded-md border bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input placeholder="Rótulo da pergunta" className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" value={question.label} onChange={(event) => updateQuestion(index, { label: event.target.value })} />
                <select className="rounded-md border border-gray-300 px-3 py-2 text-sm" value={question.type} onChange={(event) => updateQuestion(index, { type: event.target.value as QuestionType })}>
                  <option value="TEXT">Texto curto</option>
                  <option value="TEXTAREA">Texto longo (parágrafo)</option>
                  <option value="NUMBER">Número</option>
                  <option value="DATE">Data</option>
                  <option value="SELECT">Seleção (dropdown)</option>
                  <option value="CHECKBOX">Checkbox</option>
                  <option value="YES_NO_JUSTIFY">Sim/Não com condicionais</option>
                </select>
              </div>
              {!question.id && <span className="inline-block rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Nova pergunta</span>}

              {(question.type === "SELECT" || question.type === "CHECKBOX") && <QuestionOptionsEditor options={question.options} onChange={(options) => updateQuestion(index, { options })} />}
              {question.type === "YES_NO_JUSTIFY" && <p className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">SIM mostra o adendo opcional com links; NÃO exige justificativa.</p>}
              {(question.type === "TEXTAREA" || question.type === "YES_NO_JUSTIFY") && (
                <label className="flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-gray-600">
                  <input type="checkbox" checked={question.isRepeatable} onChange={(event) => updateQuestion(index, { isRepeatable: event.target.checked })} />
                  Repetível — o usuário adiciona e remove linhas ao preencher
                </label>
              )}
              {question.isRepeatable && <input placeholder="Linha de exemplo (opcional)" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={question.defaultRowText} onChange={(event) => updateQuestion(index, { defaultRowText: event.target.value })} />}
              <QuestionStyleControls fontSize={question.fontSize} isBold={question.isBold} isItalic={question.isItalic} onChange={(patch) => updateQuestion(index, patch)} />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={question.isRequired} onChange={(event) => updateQuestion(index, { isRequired: event.target.checked })} />{question.isRepeatable ? "Exige ao menos 1 linha" : "Obrigatória"}</label>
                <button type="button" onClick={() => setQuestions((current) => current.filter((_, i) => i !== index))} className="text-xs text-red-600 hover:underline">Remover pergunta</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setQuestions((current) => [...current, { ...emptyQuestion, options: [] }])} className="text-sm font-medium text-primary hover:underline">+ Adicionar pergunta</button>
        </div>

        {errorMsg && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>}
        {infoMsg && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">{infoMsg}</p>}
        <button type="submit" disabled={saving} className="w-full rounded-md bg-primary py-2.5 font-medium text-white transition hover:bg-primary-dark disabled:opacity-50">{saving ? "Salvando..." : "Salvar Alterações"}</button>
      </form>

      <div className="mt-10 rounded-lg border border-red-200 bg-red-50 p-4">
        <h2 className="mb-1 text-sm font-semibold text-red-800">Zona de perigo</h2>
        <p className="mb-3 text-xs text-red-700">Se houver submissões antigas, o modelo será desativado em vez de apagar o histórico.</p>
        <button type="button" onClick={handleDelete} disabled={deleting} className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50 ${confirmingDelete ? "bg-red-600 text-white hover:bg-red-700" : "border border-red-300 bg-white text-red-700 hover:bg-red-100"}`}>{deleting ? "Excluindo..." : confirmingDelete ? "Confirmar exclusão definitiva?" : "Excluir modelo"}</button>
        {confirmingDelete && !deleting && <button type="button" onClick={() => setConfirmingDelete(false)} className="ml-2 text-sm text-gray-500 hover:underline">Cancelar</button>}
      </div>
    </main>
  );
}
