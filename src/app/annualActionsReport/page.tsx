"use client";

import { useState, useMemo, useCallback } from "react";
import { signOut } from "next-auth/react";
import {
  FormBaseProps,
  Registro,
  EQUIPES,
  CANAIS,
  TIPOS,
  INDICADORES,
  STATUSES,
  INITIAL_FORM_STATE,
} from "./forms/forms";
import { FormCourses } from "./forms/formCourses";
import { FormDisclouse } from "./forms/formDisclouse";
import { FormFeatures } from "./forms/formFeatures";
import { FormPoliticas } from "./forms/formPolitics";
import { FormPublications } from "./forms/formPublications";
import { FormTechnology } from "./forms/formTechnology";

// ─── Tipos auxiliares ────────────────────────────────────────────────────────
type TabId =
  | "registro"
  | "meus-registros"
  | "validacao"
  | "resultados-equipe"
  | "resultados-ciaten";

type SubmitStatus = "idle" | "loading" | "success" | "error";

// ─── Constantes ──────────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string }[] = [
  { id: "registro", label: "Novo registro" },
  { id: "meus-registros", label: "Meus registros" },
  { id: "validacao", label: "Validação" },
  { id: "resultados-equipe", label: "Resultados por Equipe" },
  { id: "resultados-ciaten", label: "Resultados do CIATEN" },
];

// ─── Componente principal ────────────────────────────────────────────────────
export default function AnnualActionsReportPage() {
  const [activeTab, setActiveTab] = useState<TabId>("registro");
  const [registros, setRegistros] = useState<Registro[]>([]);

  // Formulário
  const [editingId, setEditingId] = useState<string | null>(null);
  const [equipeSel, setEquipeSel] = useState("");
  const [indicadorSel, setIndicadorSel] = useState("");
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [evidencia, setEvidencia] = useState("");
  const [dataRealizacao, setDataRealizacao] = useState("");
  const [participantes, setParticipantes] = useState("");
  const [canal, setCanal] = useState("");
  const [alcance, setAlcance] = useState("");
  const [financiador, setFinanciador] = useState("");
  const [valorAprovado, setValorAprovado] = useState("");
  const [moeda, setMoeda] = useState("BRL");

  // UI
  const [filtroEquipe, setFiltroEquipe] = useState("");
  const [ajusteTex, setAjusteTex] = useState<Record<string, string>>({});
  const [openAjusteId, setOpenAjusteId] = useState<string | null>(null);
  const [ajusteError, setAjusteError] = useState<string | null>(null);
  const [modalData, setModalData] = useState<{ key: string; equipe: string } | null>(null);

  // ── Estado de submissão ao Google Sheets ──
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ─── Reset ────────────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setEditingId(null);
    setEquipeSel("");
    setIndicadorSel("");
    setNome("");
    setTipo("");
    setStatus("");
    setEvidencia("");
    setDataRealizacao("");
    setParticipantes("");
    setCanal("");
    setAlcance("");
    setFinanciador("");
    setValorAprovado("");
    setMoeda("BRL");
    setSubmitStatus("idle");
    setSubmitError(null);
  }, []);

  // ─── Preencher edição ─────────────────────────────────────────────────────
  const preencherEdicao = useCallback(
    (id: string) => {
      const r = registros.find((x) => x.id === id);
      if (!r) return;
      setEditingId(id);
      setActiveTab("registro");
      setEquipeSel(r.equipe);
      setIndicadorSel(r.indicador_key);
      setNome(r.nome);
      setTipo(r.tipo ?? "");
      setStatus(r.status ?? "");
      setEvidencia(r.evidencia ?? "");
      setDataRealizacao(r.data_realizacao ?? "");
      setParticipantes(r.participantes ?? "");
      setCanal(r.canal ?? "");
      setAlcance(r.alcance ?? "");
      setFinanciador(r.financiador ?? "");
      setValorAprovado(r.valor_aprovado ?? "");
      setMoeda(r.moeda ?? "BRL");
      setSubmitStatus("idle");
      setSubmitError(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [registros]
  );

  // ─── Enviar para Google Sheets ────────────────────────────────────────────
  const saveToSheets = useCallback(async (registro: Registro): Promise<void> => {
    const res = await fetch("/api/annual-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registro),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }
  }, []);

  // ─── handleSubmit ─────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!indicadorSel || !equipeSel) return;

      setSubmitStatus("loading");
      setSubmitError(null);

      const now = new Date().toISOString();

      let novoRegistro: Registro;

      if (editingId) {
        const registroEditado: Registro = {
          ...(registros.find((r) => r.id === editingId)!),
          equipe: equipeSel,
          indicador_key: indicadorSel,
          indicador: INDICADORES[indicadorSel],
          nome,
          tipo,
          status: indicadorSel === "divulgacao" ? "Publicado" : status,
          evidencia,
          data_realizacao: dataRealizacao,
          participantes,
          canal,
          alcance,
          financiador,
          valor_aprovado: valorAprovado,
          moeda,
          validado: "Pendente",
          nota_validacao: "",
          data_validacao: "",
          ultima_edicao: now,
        };
        novoRegistro = registroEditado;
      } else {
        novoRegistro = {
          id: Date.now().toString(),
          timestamp: now,
          ano: new Date().getFullYear(),
          equipe: equipeSel,
          indicador_key: indicadorSel,
          indicador: INDICADORES[indicadorSel],
          nome,
          tipo: indicadorSel === "recursos" ? "Captação de recursos" : tipo,
          status: indicadorSel === "divulgacao" ? "Publicado" : status,
          evidencia,
          data_realizacao: dataRealizacao,
          participantes,
          canal,
          alcance,
          financiador,
          valor_aprovado: valorAprovado,
          moeda,
          validado: "Pendente",
        };
      }

      try {
        await saveToSheets(novoRegistro);

        // Atualiza estado local somente após sucesso na API
        if (editingId) {
          setRegistros((prev) =>
            prev.map((r) => (r.id === editingId ? novoRegistro : r))
          );
        } else {
          setRegistros((prev) => [...prev, novoRegistro]);
        }

        setSubmitStatus("success");
        resetForm();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro desconhecido.";
        setSubmitStatus("error");
        setSubmitError(message);
      }
    },
    [
      editingId, equipeSel, indicadorSel, nome, tipo, status,
      evidencia, dataRealizacao, participantes, canal, alcance,
      financiador, valorAprovado, moeda, registros, saveToSheets, resetForm,
    ]
  );

  // ─── Validação coordenação ────────────────────────────────────────────────
  const validarRegistro = useCallback(
    (id: string, statusVal: Registro["validado"], nota = "") => {
      setRegistros((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, validado: statusVal, nota_validacao: nota, data_validacao: new Date().toISOString() }
            : r
        )
      );
      setOpenAjusteId(null);
      setAjusteError(null);
    },
    []
  );

  // ─── Contabilização ───────────────────────────────────────────────────────
  const contabiliza = useCallback((r: Registro): number => {
    if (r.validado !== "Sim" || !r.evidencia) return 0;
    const { indicador_key: k, status: s } = r;
    if (k === "politicas" || k === "cursos") return s === "Concluído" ? 1 : 0;
    if (k === "publicacoes") return ["Aceito", "Publicado"].includes(s ?? "") ? 1 : 0;
    if (k === "tecnologia") return ["Piloto", "Implementado"].includes(s ?? "") ? 1 : 0;
    if (k === "divulgacao") return 1;
    if (k === "recursos") return ["Aprovado", "Recurso recebido"].includes(s ?? "") ? 1 : 0;
    return 0;
  }, []);

  // ─── Memos de resultados ──────────────────────────────────────────────────
  const resumo = useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    EQUIPES.forEach((e) => {
      out[e] = { politicas: 0, publicacoes: 0, cursos: 0, tecnologia: 0, divulgacao: 0, recursos: 0 };
    });
    registros.forEach((r) => {
      if (!out[r.equipe] || !contabiliza(r)) return;
      if (r.indicador_key === "divulgacao") {
        out[r.equipe].divulgacao += Number(r.alcance ?? 0);
      } else if (r.indicador_key === "recursos" && r.moeda === "BRL") {
        out[r.equipe].recursos += Number(r.valor_aprovado ?? 0);
      } else if (r.indicador_key !== "recursos") {
        out[r.equipe][r.indicador_key]++;
      }
    });
    return out;
  }, [registros, contabiliza]);

  const totais = useMemo(() => {
    const t = { politicas: 0, publicacoes: 0, cursos: 0, tecnologia: 0, divulgacao: 0, recursos: 0 };
    Object.values(resumo).forEach((v) => {
      (Object.keys(t) as (keyof typeof t)[]).forEach((k) => { t[k] += v[k] ?? 0; });
    });
    return t;
  }, [resumo]);

  const usdTotal = useMemo(
    () =>
      registros
        .filter((r) => contabiliza(r) && r.indicador_key === "recursos" && r.moeda === "USD")
        .reduce((a, r) => a + Number(r.valor_aprovado ?? 0), 0),
    [registros, contabiliza]
  );

  const registrosModal = useMemo(() => {
    if (!modalData) return [];
    return registros.filter(
      (r) => contabiliza(r) && r.indicador_key === modalData.key && (!modalData.equipe || r.equipe === modalData.equipe)
    );
  }, [registros, modalData, contabiliza]);

  // ─── Exportar CSV ─────────────────────────────────────────────────────────
  const exportCsv = useCallback(() => {
    if (!registros.length) return;
    const cols = Array.from(new Set(registros.flatMap((o) => Object.keys(o))));
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csvContent = [
      cols.map(q).join(","),
      ...registros.map((r) => cols.map((c) => q((r as Record<string, unknown>)[c])).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ciaten_registros_${new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [registros]);

  // ─── Listas derivadas ─────────────────────────────────────────────────────
  const pendentesList = useMemo(
    () => registros.filter((r) => !r.validado || r.validado === "Pendente").reverse(),
    [registros]
  );
  const historicoList = useMemo(
    () => registros.filter((r) => r.validado && r.validado !== "Pendente").reverse(),
    [registros]
  );

  // ─── Props dinâmicas do sub-formulário ────────────────────────────────────
  const formProps: FormBaseProps = {
    tipo, setTipo,
    status, setStatus,
    evidencia, setEvidencia,
    dataRealizacao, setDataRealizacao,
    participantes, setParticipantes,
    canal, setCanal,
    alcance, setAlcance,
    financiador, setFinanciador,
    valorAprovado, setValorAprovado,
    moeda, setMoeda,
    TIPOS,
    STATUSES,
    CANAIS,
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#f4f7fb] py-8 px-4 font-sans text-[#18324a]">
      <div className="max-w-[920px] mx-auto space-y-4">

        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold m-0 text-[#18324a]">
              CIATEN — Registro de Resultados {new Date().getFullYear()}
            </h1>
            <p className="text-sm text-[#687b8d] mt-1 m-0">
              Formulário enxuto: apenas o que é necessário para contar, validar e comprovar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm font-medium rounded-[10px] border transition ${
                  activeTab === tab.id
                    ? "bg-[#1f5f8b] text-white border-[#1f5f8b]"
                    : "bg-white text-[#18324a] border-[#dbe4ec] hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── ABA: REGISTRO ─────────────────────────────────────────────── */}
        {activeTab === "registro" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            {editingId && (
              <div className="border border-[#f0d692] bg-[#fff8e7] text-[#795d13] rounded-[11px] p-3 flex justify-between items-center gap-3">
                <div>
                  <b>Corrigindo um registro devolvido.</b>
                  <div className="text-xs text-[#687b8d]">
                    Faça o ajuste e reenvie. O mesmo registro voltará para a fila de validação.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 text-xs font-bold bg-white border border-[#dbe4ec] rounded-[10px] text-[#18324a]"
                >
                  Cancelar edição
                </button>
              </div>
            )}

            {/* Feedback de envio */}
            {submitStatus === "success" && (
              <div className="border border-[#a3d9b8] bg-[#e7f6ef] text-[#1b7f5a] rounded-[11px] p-3">
                ✓ Registro salvo com sucesso na planilha e enviado para validação.
              </div>
            )}
            {submitStatus === "error" && (
              <div className="border border-[#f5c6c6] bg-[#fdeaea] text-[#a13b3b] rounded-[11px] p-3">
                <b>Erro ao salvar na planilha:</b> {submitError}
                <div className="text-xs mt-1">
                  Verifique sua conexão e tente novamente. Os dados do formulário foram mantidos.
                </div>
              </div>
            )}

            {/* Campos principais */}
            <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] space-y-3">
              <h2 className="text-lg font-bold m-0 text-[#18324a]">Registro</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold mb-1">Equipe *</label>
                  <select
                    value={equipeSel}
                    onChange={(e) => setEquipeSel(e.target.value)}
                    required
                    className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white text-[#18324a] focus:outline-[#1f5f8b]"
                  >
                    <option value="">Selecione</option>
                    {EQUIPES.map((eq) => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">Indicador *</label>
                  <select
                    value={indicadorSel}
                    onChange={(e) => {
                      setIndicadorSel(e.target.value);
                      setTipo("");
                      setStatus("");
                    }}
                    required
                    className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white text-[#18324a] focus:outline-[#1f5f8b]"
                  >
                    <option value="">Selecione</option>
                    {Object.entries(INDICADORES).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-1">Nome do produto/atividade *</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex.: Mapa de Evidências sobre Raiva"
                    required
                    className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white text-[#18324a] focus:outline-[#1f5f8b]"
                  />
                </div>
              </div>
            </div>

            {/* Sub-formulários por indicador */}
            {indicadorSel === "politicas"   && <FormPoliticas   {...formProps} />}
            {indicadorSel === "publicacoes" && <FormPublications {...formProps} />}
            {indicadorSel === "cursos"      && <FormCourses     {...formProps} />}
            {indicadorSel === "tecnologia"  && <FormTechnology  {...formProps} />}
            {indicadorSel === "divulgacao"  && <FormDisclouse   {...formProps} />}
            {indicadorSel === "recursos"    && <FormFeatures    {...formProps} />}

            {/* Painel de ações */}
            <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] space-y-3">
              <div className="text-xs text-[#687b8d]">
                ID, data/hora, ano, contabilização e validação são automáticos e não aparecem para a equipe.
              </div>
              <div className="flex gap-2.5 flex-wrap items-center">
                <button
                  type="submit"
                  disabled={submitStatus === "loading"}
                  className="px-4 py-2.5 bg-[#1f5f8b] text-white font-bold rounded-[10px] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitStatus === "loading" && (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {submitStatus === "loading"
                    ? "Salvando..."
                    : editingId
                    ? "Reenviar para validação"
                    : "Enviar registro"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-white border border-[#dbe4ec] font-bold rounded-[10px]"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="px-4 py-2.5 bg-[#e9f2f8] text-[#1f5f8b] font-bold rounded-[10px]"
                >
                  Sair
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── As outras abas permanecem iguais ao original ─────────────── */}
        {/* (meus-registros, validacao, resultados-equipe, resultados-ciaten) */}
        {/* Cole aqui o restante do JSX original sem alterações             */}

      </div>
    </main>
  );
}