"use client";
/**
 * useAnnualReport.ts — Custom hook com todo o estado e lógica da página.
 * Zero JSX. Zero Tailwind.
 */
import { useState, useMemo, useCallback } from "react";
import {
  Registro, IndicadorKey, INDICADORES, EQUIPES,
  buildRegistro, contabiliza,
} from "../forms/domain";

export type TabId = "registro" | "meus-registros" | "validacao" | "resultados-equipe" | "resultados-ciaten";
export type SubmitStatus = "idle" | "loading" | "success" | "error";

export function useAnnualReport() {
  const [activeTab,      setActiveTab]      = useState<TabId>("registro");
  const [registros,      setRegistros]      = useState<Registro[]>([]);
  const [editingId,      setEditingId]      = useState<string | null>(null);
  const [equipeSel,      setEquipeSel]      = useState("");
  const [indicadorSel,   setIndicadorSel]   = useState<IndicadorKey | "">("");
  const [nome,           setNome]           = useState("");
  const [tipo,           setTipo]           = useState("");
  const [status,         setStatus]         = useState("");
  const [evidencia,      setEvidencia]      = useState("");
  const [dataRealizacao, setDataRealizacao] = useState("");
  const [participantes,  setParticipantes]  = useState("");
  const [canal,          setCanal]          = useState("");
  const [alcance,        setAlcance]        = useState("");
  const [financiador,    setFinanciador]    = useState("");
  const [valorAprovado,  setValorAprovado]  = useState("");
  const [moeda,          setMoeda]          = useState("BRL");
  const [filtroEquipe,   setFiltroEquipe]   = useState("");
  const [ajusteTex,      setAjusteTex]      = useState<Record<string, string>>({});
  const [openAjusteId,   setOpenAjusteId]   = useState<string | null>(null);
  const [ajusteError,    setAjusteError]    = useState<string | null>(null);
  const [modalData,      setModalData]      = useState<{ key: IndicadorKey; equipe: string } | null>(null);
  const [submitStatus,   setSubmitStatus]   = useState<SubmitStatus>("idle");
  const [submitError,    setSubmitError]    = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setEditingId(null); setEquipeSel(""); setIndicadorSel(""); setNome("");
    setTipo(""); setStatus(""); setEvidencia(""); setDataRealizacao("");
    setParticipantes(""); setCanal(""); setAlcance(""); setFinanciador("");
    setValorAprovado(""); setMoeda("BRL"); setSubmitStatus("idle"); setSubmitError(null);
  }, []);

  const preencherEdicao = useCallback((id: string) => {
    const r = registros.find((x) => x.id === id);
    if (!r) return;
    setEditingId(id); setActiveTab("registro");
    setEquipeSel(r.equipe); setIndicadorSel(r.indicador_key);
    setNome(r.nome); setTipo(r.tipo ?? ""); setStatus(r.status ?? "");
    setEvidencia(r.evidencia ?? ""); setDataRealizacao(r.data_realizacao ?? "");
    setParticipantes(r.participantes ?? ""); setCanal(r.canal ?? "");
    setAlcance(r.alcance ?? ""); setFinanciador(r.financiador ?? "");
    setValorAprovado(r.valor_aprovado ?? ""); setMoeda(r.moeda ?? "BRL");
    setSubmitStatus("idle"); setSubmitError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [registros]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicadorSel || !equipeSel) return;
    setSubmitStatus("loading");
    setSubmitError(null);

    const fields = { equipeSel, indicadorSel, nome, tipo, status, evidencia,
      dataRealizacao, participantes, canal, alcance, financiador, valorAprovado, moeda };

    let registro: Registro;
    if (editingId) {
      const existing = registros.find((r) => r.id === editingId)!;
      registro = { ...existing, ...buildRegistro(fields), id: existing.id, timestamp: existing.timestamp, ultima_edicao: new Date().toISOString() };
    } else {
      registro = buildRegistro(fields);
    }

    try {
      const res = await fetch("/api/annual-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registro, isEdit: !!editingId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      if (editingId) {
        setRegistros((prev) => prev.map((r) => (r.id === editingId ? registro : r)));
      } else {
        setRegistros((prev) => [...prev, registro]);
      }
      setSubmitStatus("success");
      resetForm();
    } catch (err) {
      setSubmitStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Erro desconhecido.");
    }
  }, [editingId, equipeSel, indicadorSel, nome, tipo, status, evidencia,
      dataRealizacao, participantes, canal, alcance, financiador, valorAprovado, moeda, registros, resetForm]);

  const validarRegistro = useCallback((id: string, statusVal: Registro["validado"], nota = "") => {
    setRegistros((prev) => prev.map((r) =>
      r.id === id ? { ...r, validado: statusVal, nota_validacao: nota, data_validacao: new Date().toISOString() } : r
    ));
    setOpenAjusteId(null);
    setAjusteError(null);
  }, []);

  const resumo = useMemo(() => {
    const out: Record<string, Record<IndicadorKey, number>> = {};
    EQUIPES.forEach((e) => { out[e] = { politicas: 0, publicacoes: 0, cursos: 0, tecnologia: 0, divulgacao: 0, recursos: 0 }; });
    registros.forEach((r) => {
      if (!out[r.equipe] || !contabiliza(r)) return;
      if (r.indicador_key === "divulgacao") out[r.equipe].divulgacao += Number(r.alcance ?? 0);
      else if (r.indicador_key === "recursos" && r.moeda === "BRL") out[r.equipe].recursos += Number(r.valor_aprovado ?? 0);
      else out[r.equipe][r.indicador_key]++;
    });
    return out;
  }, [registros]);

  const totais = useMemo(() => {
    const t: Record<IndicadorKey, number> = { politicas: 0, publicacoes: 0, cursos: 0, tecnologia: 0, divulgacao: 0, recursos: 0 };
    Object.values(resumo).forEach((v) => { (Object.keys(t) as IndicadorKey[]).forEach((k) => { t[k] += v[k] ?? 0; }); });
    return t;
  }, [resumo]);

  const usdTotal = useMemo(() =>
    registros.filter((r) => contabiliza(r) && r.indicador_key === "recursos" && r.moeda === "USD")
             .reduce((a, r) => a + Number(r.valor_aprovado ?? 0), 0), [registros]);

  const registrosModal = useMemo(() => {
    if (!modalData) return [];
    return registros.filter((r) => contabiliza(r) && r.indicador_key === modalData.key && (!modalData.equipe || r.equipe === modalData.equipe));
  }, [registros, modalData]);

  const pendentesList = useMemo(() => registros.filter((r) => !r.validado || r.validado === "Pendente").reverse(), [registros]);
  const historicoList = useMemo(() => registros.filter((r) => r.validado && r.validado !== "Pendente").reverse(), [registros]);

  // ─── Tabela 1: linhas estáticas + valores calculados ─────────────────────
  // Espelha TABELA1_LINHAS de Tabs.tsx mas em formato puro (sem JSX)
  // para que o hook possa gerar CSV e gravar no Sheets sem depender do componente.
  const tabela1Rows = useMemo(() => {
    const ano = new Date().getFullYear();
    const fmtBrl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const formatResult = (key: IndicadorKey): string => {
      switch (key) {
        case "politicas":   return `${totais.politicas} documento${totais.politicas !== 1 ? "s" : ""}`;
        case "publicacoes": return `${totais.publicacoes} publicaç${totais.publicacoes !== 1 ? "ões" : "ão"}`;
        case "cursos":      return `${totais.cursos} ação${totais.cursos !== 1 ? "ões" : ""} formativa${totais.cursos !== 1 ? "s" : ""}`;
        case "tecnologia":  return `${totais.tecnologia} projeto${totais.tecnologia !== 1 ? "s" : ""} tecnológico${totais.tecnologia !== 1 ? "s" : ""}`;
        case "divulgacao":  return totais.divulgacao > 0 ? `${totais.divulgacao.toLocaleString("pt-BR")} interações` : "a ser calculado";
        case "recursos": {
          const brl = totais.recursos > 0 ? fmtBrl(totais.recursos) : "";
          const usdStr = usdTotal > 0 ? `US$ ${usdTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "";
          return [brl, usdStr].filter(Boolean).join(" + ") || "R$ 0,00";
        }
      }
    };

    return [
      { indicador: "Documentos de recomendação para políticas públicas",    mede: "Capacidade do CIATEN de produzir evidências aplicáveis à tomada de decisão e apoiar gestores com proposições claras.",          calculo: "Contagem total dos documentos com recomendações (mapas de evidências, relatórios técnicos, sínteses) que foram concluídos e validados.", resultado: formatResult("politicas"),   ano: String(ano) },
      { indicador: "Publicações científicas",                               mede: "Produção de conhecimento técnico-científico vinculada aos núcleos e plataformas do CIATEN.",                                        calculo: "Soma de artigos, capítulos, livros, relatórios técnicos com ISSN/ISBN, pré-prints ou aceitações formais.",                              resultado: formatResult("publicacoes"), ano: String(ano) },
      { indicador: "Cursos, eventos e ações de formação",                   mede: "Atividades formativas que qualificam profissionais e difundem conhecimento.",                                                        calculo: "Número total de cursos, oficinas, workshops, webinários e eventos realizados e validados.",                                              resultado: formatResult("cursos"),       ano: String(ano) },
      { indicador: "Projetos de inovação e desenvolvimento tecnológico",    mede: "Iniciativas que envolvem criação, prototipagem ou aprimoramento de tecnologias e soluções inovadoras.",                              calculo: "Contagem de projetos registrados (softwares, dashboards, dispositivos, biotecnologias) em fase de piloto ou implementados.",              resultado: formatResult("tecnologia"),   ano: String(ano) },
      { indicador: "Alcance e engajamento nas redes sociais",               mede: "Impacto e visibilidade do CIATEN na comunicação institucional.",                                                                      calculo: "Soma de visualizações, acessos e interações em todas as redes sociais informadas nos registros validados.",                               resultado: formatResult("divulgacao"),   ano: String(ano) },
      { indicador: "Captação de recursos institucionais",                   mede: "Capacidade de mobilização financeira para pesquisa, inovação, eventos e parcerias.",                                                 calculo: "Soma de recursos captados via editais, convênios, cooperações e apoios institucionais aprovados.",                                         resultado: formatResult("recursos"),     ano: String(ano) },
    ];
  }, [totais, usdTotal]);

  // ─── Exportar CSV da Tabela 1 ────────────────────────────────────────────
  const exportTabela1Csv = useCallback(() => {
    const ano = new Date().getFullYear();
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Indicador", "O que mede", "Como é calculado", String(ano)];
    const rows = tabela1Rows.map((r) => [r.indicador, r.mede, r.calculo, r.resultado]);
    const csv = [header.map(q).join(","), ...rows.map((r) => r.map(q).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: `ciaten_tabela1_${ano}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }, [tabela1Rows]);

  // ─── Estado de exportação para o Sheets ──────────────────────────────────
  const [sheetsStatus, setSheetsStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [sheetsError,  setSheetsError]  = useState<string | null>(null);

  const exportTabela1ToSheets = useCallback(async () => {
    setSheetsStatus("loading");
    setSheetsError(null);
    try {
      const res = await fetch("/api/annual-actions/tabela1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: tabela1Rows, ano: new Date().getFullYear() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setSheetsStatus("success");
      setTimeout(() => setSheetsStatus("idle"), 4000);
    } catch (err) {
      setSheetsStatus("error");
      setSheetsError(err instanceof Error ? err.message : "Erro desconhecido.");
    }
  }, [tabela1Rows]);

  return {
    activeTab, setActiveTab, registros, setRegistros,
    editingId, equipeSel, setEquipeSel, indicadorSel, setIndicadorSel,
    nome, setNome, tipo, setTipo, status, setStatus,
    evidencia, setEvidencia, dataRealizacao, setDataRealizacao,
    participantes, setParticipantes, canal, setCanal, alcance, setAlcance,
    financiador, setFinanciador, valorAprovado, setValorAprovado, moeda, setMoeda,
    filtroEquipe, setFiltroEquipe, ajusteTex, setAjusteTex,
    openAjusteId, setOpenAjusteId, ajusteError, setAjusteError,
    modalData, setModalData, submitStatus, submitError,
    resetForm, preencherEdicao, handleSubmit, validarRegistro,
    exportTabela1Csv, exportTabela1ToSheets, sheetsStatus, sheetsError,
    resumo, totais, usdTotal, registrosModal, pendentesList, historicoList,
  };
}