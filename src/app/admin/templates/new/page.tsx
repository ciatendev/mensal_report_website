"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QuestionOptionsEditor from "@/components/QuestionOptionsEditor";
import QuestionStyleControls from "@/components/QuestionStyleControls";

type QuestionType = "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "SELECT" | "CHECKBOX" | "YES_NO_JUSTIFY";

interface DraftQuestion {
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

export default function NewTemplatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([{ ...emptyQuestion }]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question, i) => i === index ? { ...question, ...patch } : question));
  }

  function addQuestion() {
    setQuestions((current) => [...current, { ...emptyQuestion, options: [] }]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg(null);
    if (!title.trim()) return setErrorMsg("Informe um título para o modelo.");
    if (questions.some((question) => !question.label.trim())) return setErrorMsg("Todas as perguntas precisam de um rótulo.");
    const invalidSelect = questions.find((question) => question.type === "SELECT" && question.options.filter((option) => option.trim()).length === 0);
    if (invalidSelect) return setErrorMsg(`Adicione ao menos uma opção para "${invalidSelect.label}".`);

    setSaving(true);
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          questions: questions.map((question, index) => ({
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
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Erro ao criar o modelo.");
      router.push("/admin/templates");
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Novo Modelo</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Título</label>
          <input className="w-full rounded-md border border-gray-300 px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Descrição (opcional)</label>
          <textarea className="w-full rounded-md border border-gray-300 px-3 py-2" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800">Perguntas</h2>
          {questions.map((question, index) => (
            <div key={index} className="space-y-3 rounded-md border bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input placeholder="Rótulo da pergunta" className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" value={question.label} onChange={(event) => updateQuestion(index, { label: event.target.value })} />
                <select className="rounded-md border border-gray-300 px-3 py-2 text-sm" value={question.type} onChange={(event) => updateQuestion(index, { type: event.target.value as QuestionType, options: event.target.value === "SELECT" ? question.options : question.options })}>
                  <option value="TEXT">Texto curto</option>
                  <option value="TEXTAREA">Texto longo (parágrafo)</option>
                  <option value="NUMBER">Número</option>
                  <option value="DATE">Data</option>
                  <option value="SELECT">Seleção (dropdown)</option>
                  <option value="CHECKBOX">Checkbox</option>
                  <option value="YES_NO_JUSTIFY">Sim/Não com condicionais</option>
                </select>
              </div>

              {(question.type === "SELECT" || question.type === "CHECKBOX") && (
                <QuestionOptionsEditor options={question.options} onChange={(options) => updateQuestion(index, { options })} />
              )}

              {question.type === "YES_NO_JUSTIFY" && (
                <p className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  SIM mostra o campo opcional de adendo com links; NÃO exige justificativa. Em perguntas repetíveis, o usuário poderá adicionar várias linhas.
                </p>
              )}

              {(question.type === "TEXTAREA" || question.type === "YES_NO_JUSTIFY") && (
                <label className="flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-gray-600">
                  <input type="checkbox" checked={question.isRepeatable} onChange={(event) => updateQuestion(index, { isRepeatable: event.target.checked })} />
                  Repetível — o usuário adiciona e remove linhas ao preencher
                </label>
              )}

              {question.isRepeatable && (
                <input placeholder="Linha de exemplo (opcional)" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={question.defaultRowText} onChange={(event) => updateQuestion(index, { defaultRowText: event.target.value })} />
              )}

              <QuestionStyleControls fontSize={question.fontSize} isBold={question.isBold} isItalic={question.isItalic} onChange={(patch) => updateQuestion(index, patch)} />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={question.isRequired} onChange={(event) => updateQuestion(index, { isRequired: event.target.checked })} />
                  {question.isRepeatable ? "Exige ao menos 1 linha" : "Obrigatória"}
                </label>
                {questions.length > 1 && <button type="button" onClick={() => setQuestions((current) => current.filter((_, i) => i !== index))} className="text-xs text-red-600 hover:underline">Remover pergunta</button>}
              </div>
            </div>
          ))}
          <button type="button" onClick={addQuestion} className="text-sm font-medium text-primary hover:underline">+ Adicionar pergunta</button>
        </div>

        {errorMsg && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>}
        <button type="submit" disabled={saving} className="w-full rounded-md bg-primary py-2.5 font-medium text-white transition hover:bg-primary-dark disabled:opacity-50">{saving ? "Salvando..." : "Salvar Modelo"}</button>
      </form>
    </main>
  );
}
