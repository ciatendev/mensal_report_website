"use client";
/**
 * useAnnualReport.ts — Custom hook com todo o estado e lógica da página.
 *
 * Dois conjuntos de dados independentes:
 *   • `meusRegistros`  — registros do usuário logado (qualquer status)
 *                        fonte: GET /api/annual-actions/records
 *                        usado em: Meus Registros, Validação
 *
 *   • `aprovados`      — TODOS os registros aprovados (qualquer autor)
 *                        fonte: GET /api/annual-actions/summary
 *                        usado em: Por Equipe, Síntese CIATEN, Modal
 *
 * Isso resolve o bug em que o resumo/totais ficava zerado porque
 * usuários comuns só viam os próprios registros.
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  DbRegistro, IndicadorKey, INDICADORES, contabiliza,
} from "../forms/domain";

export type TabId = "registro" | "meus-registros" | "validacao" | "resultados-equipe" | "resultados-ciaten";
export type SubmitStatus = "idle" | "loading" | "success" | "error";

// Shape mínimo retornado pelo endpoint /summary (sem dados do autor)
export type ChangeRequestRow = {
  id: string;
  recordId: string;
  type: "EDIT" | "DELETE";
  status: "PENDING" | "APPROVED" | "REJECTED";
  nota?: string | null;
  reviewNote?: string | null;
  editFields?: string | null;
  createdAt: string;
  requestedBy: { id: string; name: string | null; email: string };
  reviewedBy?: { id: string; name: string | null } | null;
  record: { id: string; nome: string; equipe: string; indicador: string; activityStatus: string; syncedToSheets: boolean };
};

export type ApprovedRecord = Pick<DbRegistro,
  "id" | "equipe" | "indicadorKey" | "indicador" | "nome" | "tipo" |
  "statusAtividade" | "evidencia" | "alcance" | "valorAprovado" | "moeda" |
  "financiador" | "ano" | "activityStatus" | "syncedToSheets"
>;

export function useAnnualReport() {
  const [activeTab,     setActiveTab]     = useState<TabId>("registro");

  // Meus registros (filtrado pelo back — só os do usuário logado)
  const [meusRegistros, setMeusRegistros] = useState<DbRegistro[]>([]);
  const [loadingMeus,   setLoadingMeus]   = useState(false);

  // Todos os aprovados (para tabelas de resultado)
  const [aprovados,     setAprovados]     = useState<ApprovedRecord[]>([]);
  const [loadingAprov,  setLoadingAprov]  = useState(false);

  // Equipes criadas no banco (para o SUPER_USER selecionar e para o resumo)
  const [dbEquipes, setDbEquipes] = useState<string[]>([]);

  // Formulário
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

  // UI
  const [filtroEquipe,  setFiltroEquipe]  = useState("");
  const [ajusteTex,     setAjusteTex]     = useState<Record<string, string>>({});
  const [openAjusteId,  setOpenAjusteId]  = useState<string | null>(null);
  const [ajusteError,   setAjusteError]   = useState<string | null>(null);
  const [modalData,     setModalData]     = useState<{ key: IndicadorKey; equipe: string } | null>(null);
  const [submitStatus,  setSubmitStatus]  = useState<SubmitStatus>("idle");
  const [submitError,   setSubmitError]   = useState<string | null>(null);
  const [sheetsStatus,  setSheetsStatus]  = useState<SubmitStatus>("idle");
  const [sheetsError,   setSheetsError]   = useState<string | null>(null);

  // ─── Fetch 1: meus registros (qualquer status, só do usuário) ────────────
  const fetchMeus = useCallback(async () => {
    setLoadingMeus(true);
    try {
      const res = await fetch("/api/annual-actions/records");
      if (res.ok) setMeusRegistros(await res.json());
    } catch (e) {
      console.error("Erro ao carregar meus registros:", e);
    } finally {
      setLoadingMeus(false);
    }
  }, []);

  // ─── Fetch 2: todos aprovados (para tabelas de resultado) ────────────────
  const fetchAprovados = useCallback(async () => {
    setLoadingAprov(true);
    try {
      const res = await fetch("/api/annual-actions/summary");
      if (res.ok) setAprovados(await res.json());
    } catch (e) {
      console.error("Erro ao carregar aprovados:", e);
    } finally {
      setLoadingAprov(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchMeus();
    fetchAprovados();
    // Busca equipe do usuário logado para pré-preencher o campo e restringir acesso
    fetch("/api/teams/my")
      .then((r) => r.json())
      .then((team) => {
        setUserTeam(team ?? null);
        if (team?.nome) setEquipeSel(team.nome);
      })
      .catch(() => setUserTeam(null));

    // Busca lista de equipes do banco (para o SUPER_USER selecionar)
    fetch("/api/teams")
      .then((r) => r.ok ? r.json() : [])
      .then((teams: { nome: string }[]) => {
        if (Array.isArray(teams) && teams.length > 0) {
          setDbEquipes(teams.map((t) => t.nome));
        }
      })
      .catch(() => {});
  }, [fetchMeus, fetchAprovados]);

  // Recarrega ao mudar de aba
  useEffect(() => {
    if (activeTab === "meus-registros" || activeTab === "validacao") fetchMeus();
    if (activeTab === "resultados-equipe" || activeTab === "resultados-ciaten") fetchAprovados();
  }, [activeTab, fetchMeus, fetchAprovados]);

  // ─── Computed: listas para Meus Registros e Validação ────────────────────
  const pendentesList = useMemo(
    () => meusRegistros.filter((r) => r.activityStatus === "PENDING"),
    [meusRegistros]
  );
  const historicoList = useMemo(
    () => meusRegistros.filter((r) => r.activityStatus !== "PENDING").reverse(),
    [meusRegistros]
  );

  // ─── Computed: resumo por equipe (usa `aprovados`) ────────────────────────
  const resumo = useMemo(() => {
    const out: Record<string, Record<IndicadorKey, number>> = {};
    dbEquipes.forEach((e) => {
      out[e] = { politicas: 0, publicacoes: 0, cursos: 0, tecnologia: 0, divulgacao: 0, recursos: 0 };
    });
    aprovados.forEach((r) => {
      if (!out[r.equipe]) return;
      // contabiliza usa activityStatus — aprovados já são APPROVED, mas ainda
      // precisam satisfazer a regra do statusAtividade. Usamos cast para DbRegistro
      // parcial — os campos necessários para contabiliza estão presentes.
      if (!contabiliza(r as unknown as DbRegistro)) return;
      if (r.indicadorKey === "divulgacao") {
        out[r.equipe].divulgacao += Number(r.alcance ?? 0);
      } else if (r.indicadorKey === "recursos" && r.moeda === "BRL") {
        out[r.equipe].recursos += Number(r.valorAprovado ?? 0);
      } else {
        out[r.equipe][r.indicadorKey]++;
      }
    });
    return out;
  }, [aprovados]);

  const totais = useMemo(() => {
    const t: Record<IndicadorKey, number> = {
      politicas: 0, publicacoes: 0, cursos: 0, tecnologia: 0, divulgacao: 0, recursos: 0,
    };
    Object.values(resumo).forEach((v) => {
      (Object.keys(t) as IndicadorKey[]).forEach((k) => { t[k] += v[k] ?? 0; });
    });
    return t;
  }, [resumo]);

  const usdTotal = useMemo(
    () => aprovados
      .filter((r) => contabiliza(r as unknown as DbRegistro) && r.indicadorKey === "recursos" && r.moeda === "USD")
      .reduce((a, r) => a + Number(r.valorAprovado ?? 0), 0),
    [aprovados]
  );

  const registrosModal = useMemo(() => {
    if (!modalData) return [];
    return aprovados.filter((r) =>
      contabiliza(r as unknown as DbRegistro) &&
      r.indicadorKey === modalData.key &&
      (!modalData.equipe || r.equipe === modalData.equipe)
    ) as unknown as DbRegistro[];
  }, [aprovados, modalData]);

  // ─── Reset formulário ────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setEditingId(null); setEquipeSel(userTeam?.nome ?? ""); setIndicadorSel(""); setNome("");
    setTipo(""); setStatus(""); setEvidencia(""); setDataRealizacao("");
    setParticipantes(""); setCanal(""); setAlcance(""); setFinanciador("");
    setValorAprovado(""); setMoeda("BRL"); setSubmitStatus("idle"); setSubmitError(null);
  }, []);

  // ─── Preenche formulário para edição ─────────────────────────────────────
  const preencherEdicao = useCallback((id: string) => {
    const r = meusRegistros.find((x) => x.id === id);
    if (!r) return;
    setEditingId(id); setActiveTab("registro");
    setEquipeSel(r.equipe); setIndicadorSel(r.indicadorKey);
    setNome(r.nome); setTipo(r.tipo ?? ""); setStatus(r.statusAtividade ?? "");
    setEvidencia(r.evidencia ?? ""); setDataRealizacao(r.dataRealizacao ?? "");
    setParticipantes(r.participantes ?? ""); setCanal(r.canal ?? "");
    setAlcance(r.alcance ?? ""); setFinanciador(r.financiador ?? "");
    setValorAprovado(r.valorAprovado ?? ""); setMoeda(r.moeda ?? "BRL");
    setSubmitStatus("idle"); setSubmitError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [meusRegistros]);

  // ─── Criar / editar registro ──────────────────────────────────────────────
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicadorSel || !equipeSel) return;
    setSubmitStatus("loading");
    setSubmitError(null);

    try {
      let res: Response;
      if (editingId) {
        res = await fetch(`/api/annual-actions/records/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "edit",
            nome, tipo, statusAtividade: status,
            evidencia, dataRealizacao, participantes,
            canal, alcance, financiador, valorAprovado, moeda,
          }),
        });
      } else {
        res = await fetch("/api/annual-actions/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            equipe: equipeSel,
            indicadorKey: indicadorSel,
            indicador: INDICADORES[indicadorSel as IndicadorKey],
            nome,
            ano: new Date().getFullYear(),
            tipo: indicadorSel === "recursos" ? "Captação de recursos" : tipo,
            statusAtividade: indicadorSel === "divulgacao" ? "Publicado" : status,
            evidencia, dataRealizacao, participantes,
            canal, alcance, financiador, valorAprovado,
            moeda: moeda || "BRL",
          }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      await fetchMeus();
      setSubmitStatus("success");
      resetForm();
    } catch (err) {
      setSubmitStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Erro desconhecido.");
    }
  }, [editingId, equipeSel, indicadorSel, nome, tipo, status, evidencia,
      dataRealizacao, participantes, canal, alcance, financiador, valorAprovado,
      moeda, resetForm, fetchMeus]);

  // ─── Validar (SUPER_USER) — após validar recarrega AMBAS as fontes ───────
  const validarRegistro = useCallback(async (
    id: string,
    novoStatus: "APPROVED" | "REJECTED" | "ADJUSTMENT_NEEDED",
    nota = ""
  ) => {
    const res = await fetch(`/api/annual-actions/records/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "validate", activityStatus: novoStatus, notaValidacao: nota }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("Erro ao validar:", data.error);
      return;
    }
    setOpenAjusteId(null);
    setAjusteError(null);
    // Recarrega ambas as fontes para que tabelas e meus registros fiquem em sincronia
    await Promise.all([fetchMeus(), fetchAprovados()]);
  }, [fetchMeus, fetchAprovados]);

  // ─── Tabela 1: linhas calculadas ─────────────────────────────────────────
  const tabela1Rows = useMemo(() => {
    const ano = new Date().getFullYear();
    const fmtBrl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const fmt = (key: IndicadorKey): string => {
      switch (key) {
        case "politicas":   return `${totais.politicas} documento${totais.politicas !== 1 ? "s" : ""}`;
        case "publicacoes": return `${totais.publicacoes} publicaç${totais.publicacoes !== 1 ? "ões" : "ão"}`;
        case "cursos":      return `${totais.cursos} ação${totais.cursos !== 1 ? "ões" : ""} formativa${totais.cursos !== 1 ? "s" : ""}`;
        case "tecnologia":  return `${totais.tecnologia} projeto${totais.tecnologia !== 1 ? "s" : ""} tecnológico${totais.tecnologia !== 1 ? "s" : ""}`;
        case "divulgacao":  return totais.divulgacao > 0 ? `${totais.divulgacao.toLocaleString("pt-BR")} interações` : "a ser calculado";
        case "recursos": {
          const brl = totais.recursos > 0 ? fmtBrl(totais.recursos) : "";
          const usd = usdTotal > 0 ? `US$ ${usdTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "";
          return [brl, usd].filter(Boolean).join(" + ") || "R$ 0,00";
        }
      }
    };
    return [
      { indicador: "Documentos de recomendação para políticas públicas",   mede: "Capacidade do CIATEN de produzir evidências aplicáveis à tomada de decisão.", calculo: "Contagem de documentos concluídos e validados.",                                         resultado: fmt("politicas"),   ano: String(ano) },
      { indicador: "Publicações científicas",                              mede: "Produção de conhecimento técnico-científico.",                                  calculo: "Soma de artigos, capítulos, livros, pré-prints e aceitações.",                          resultado: fmt("publicacoes"), ano: String(ano) },
      { indicador: "Cursos, eventos e ações de formação",                  mede: "Atividades formativas que qualificam profissionais.",                           calculo: "Número total de cursos, oficinas, workshops, webinários e eventos realizados.",         resultado: fmt("cursos"),       ano: String(ano) },
      { indicador: "Projetos de inovação e desenvolvimento tecnológico",   mede: "Iniciativas de criação ou aprimoramento de tecnologias.",                       calculo: "Projetos em fase de piloto ou implementados.",                                         resultado: fmt("tecnologia"),   ano: String(ano) },
      { indicador: "Alcance e engajamento nas redes sociais",              mede: "Impacto e visibilidade do CIATEN na comunicação.",                              calculo: "Soma de visualizações, acessos e interações em todas as redes.",                        resultado: fmt("divulgacao"),   ano: String(ano) },
      { indicador: "Captação de recursos institucionais",                  mede: "Capacidade de mobilização financeira.",                                         calculo: "Soma de recursos aprovados via editais, convênios e cooperações.",                      resultado: fmt("recursos"),     ano: String(ano) },
    ];
  }, [totais, usdTotal]);

  // ─── Exportar CSV — Tabela 1 ──────────────────────────────────────────────
  const exportTabela1Csv = useCallback(() => {
    const ano = new Date().getFullYear();
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Indicador", "O que mede", "Como é calculado", String(ano)];
    const rows   = tabela1Rows.map((r) => [r.indicador, r.mede, r.calculo, r.resultado]);
    const csv    = [header.map(q).join(","), ...rows.map((r) => r.map(q).join(","))].join("\n");
    const url    = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `ciaten_tabela1_${ano}.csv` }).click();
    URL.revokeObjectURL(url);
  }, [tabela1Rows]);

  // ─── Exportar CSV — Tabela 2 (Por Equipe) ────────────────────────────────
  const exportTabela2Csv = useCallback(() => {
    const ano  = new Date().getFullYear();
    const q    = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const fmtBrl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const cols = ["Equipe / Núcleo", "Doc. Políticas", "Publicações", "Cursos/Eventos", "Tecnologias", "Alcance", "Recursos BRL"];
    const rows = dbEquipes.map((eq) => [
      eq,
      resumo[eq]?.politicas   ?? 0,
      resumo[eq]?.publicacoes ?? 0,
      resumo[eq]?.cursos      ?? 0,
      resumo[eq]?.tecnologia  ?? 0,
      resumo[eq]?.divulgacao  ?? 0,
      fmtBrl(resumo[eq]?.recursos ?? 0),
    ]);
    const totalRow = [
      "Total", totais.politicas, totais.publicacoes, totais.cursos,
      totais.tecnologia, totais.divulgacao, fmtBrl(totais.recursos),
    ];
    const csv = [
      cols.map(q).join(","),
      ...rows.map((r) => r.map(q).join(",")),
      totalRow.map(q).join(","),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `ciaten_tabela2_equipes_${ano}.csv` }).click();
    URL.revokeObjectURL(url);
  }, [resumo, totais]);

  // ─── Exportar CSV — Registros (log completo) ────────────────────────────────
  const exportRegistrosCsv = useCallback(() => {
    if (!meusRegistros.length && !aprovados.length) return;
    // SUPER_USER exporta meusRegistros que já contem todos; usuário comum exporta os seus
    const fonte = meusRegistros;
    const ano = new Date().getFullYear();
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`
    const cols = [
      "ID","Data/Hora","Ano","Status","Equipe","Indicador (chave)","Indicador",
      "Nome","Tipo","Situação","Evidência","Data realização","Participantes",
      "Canal","Alcance","Financiador","Valor aprovado","Moeda",
    ];
    const rows = fonte.map(r => [
      r.id,
      new Date(r.createdAt).toLocaleString("pt-BR"),
      String(r.ano),
      r.activityStatus,
      r.equipe,
      r.indicadorKey,
      r.indicador,
      r.nome,
      r.tipo ?? "",
      r.statusAtividade ?? "",
      r.evidencia ?? "",
      r.dataRealizacao ?? "",
      r.participantes ?? "",
      r.canal ?? "",
      r.alcance ?? "",
      r.financiador ?? "",
      r.valorAprovado ?? "",
      r.moeda ?? "",
    ]);
    const csv = [cols.map(q).join(","), ...rows.map(r => r.map(q).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `ciaten_registros_${ano}.csv` }).click();
    URL.revokeObjectURL(url);
  }, [meusRegistros, aprovados]);

  // ─── Exportar Tabela 1 para Google Sheets ────────────────────────────────
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
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      setSheetsStatus("success");
      setTimeout(() => setSheetsStatus("idle"), 4000);
    } catch (err) {
      setSheetsStatus("error");
      setSheetsError(err instanceof Error ? err.message : "Erro desconhecido.");
    }
  }, [tabela1Rows]);

  // ─── Retorno público ──────────────────────────────────────────────────────
  // ─── Tipo dos estados de exportação Sheets (por target) ──────────────────
  const [sheetsExportStatus, setSheetsExportStatus] = useState<Record<string, SubmitStatus>>({});
  const [sheetsExportError,  setSheetsExportError]  = useState<Record<string, string | null>>({});
  const [changeRequests,     setChangeRequests]     = useState<ChangeRequestRow[]>([]);

  // Equipe do usuário logado (null = SUPER_USER ou sem equipe)
  const [userTeam, setUserTeam] = useState<{ id: string; nome: string } | null | undefined>(undefined);

  const exportToSheets = useCallback(async (target: "tabela1" | "tabela2" | "registros") => {
    setSheetsExportStatus((prev) => ({ ...prev, [target]: "loading" }));
    setSheetsExportError((prev) => ({ ...prev, [target]: null }));
    try {
      const res = await fetch("/api/annual-actions/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      setSheetsExportStatus((prev) => ({ ...prev, [target]: "success" }));
      setTimeout(() => setSheetsExportStatus((prev) => ({ ...prev, [target]: "idle" })), 5000);
    } catch (err) {
      setSheetsExportStatus((prev) => ({ ...prev, [target]: "error" }));
      setSheetsExportError((prev) => ({ ...prev, [target]: err instanceof Error ? err.message : "Erro desconhecido." }));
    }
  }, []);


  const fetchChangeRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/annual-actions/change-requests?pending=1");
      if (res.ok) setChangeRequests(await res.json());
    } catch (e) { console.error("change-requests fetch:", e); }
  }, []);

  useEffect(() => { fetchChangeRequests(); }, [fetchChangeRequests]);
  useEffect(() => {
    if (activeTab === "validacao") fetchChangeRequests();
  }, [activeTab, fetchChangeRequests]);

  const requestChange = useCallback(async (
    recordId: string,
    type: "EDIT" | "DELETE",
    nota?: string
  ) => {
    const res = await fetch("/api/annual-actions/change-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId, type, nota }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? "Erro ao criar solicitação.");
    }
    await fetchMeus();
  }, [fetchMeus]);

  const reviewChangeRequest = useCallback(async (
    id: string,
    decision: "APPROVED" | "REJECTED",
    reviewNote?: string
  ) => {
    const res = await fetch(`/api/annual-actions/change-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reviewNote }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error ?? "Erro ao revisar solicitação.");
    }
    await Promise.all([fetchMeus(), fetchAprovados(), fetchChangeRequests()]);
  }, [fetchMeus, fetchAprovados, fetchChangeRequests]);

  return {
    activeTab, setActiveTab,
    // Meus registros
    registros: meusRegistros,          // alias para compatibilidade
    meusRegistros,
    loadingData: loadingMeus,
    pendentesList,
    historicoList,
    // Aprovados (tabelas de resultado)
    aprovados,
    loadingAprov,
    resumo, totais, usdTotal,
    registrosModal,
    tabela1Rows,
    // Formulário
    editingId,
    equipeSel, setEquipeSel,
    indicadorSel, setIndicadorSel,
    nome, setNome,
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
    submitStatus, submitError,
    // Ações
    resetForm, preencherEdicao, handleSubmit, validarRegistro,
    fetchMeus, fetchAprovados,
    // Validação UI
    filtroEquipe, setFiltroEquipe,
    ajusteTex, setAjusteTex,
    openAjusteId, setOpenAjusteId,
    ajusteError, setAjusteError,
    modalData, setModalData,
    // Exports
    exportTabela1Csv, exportTabela2Csv, exportRegistrosCsv, exportTabela1ToSheets,
    sheetsStatus, sheetsError,
    // Exportações unificadas para Sheets (via /api/annual-actions/export)
    exportToSheets, sheetsExportStatus, sheetsExportError,
    userTeam, dbEquipes,
    changeRequests, requestChange, reviewChangeRequest, fetchChangeRequests,
  };
}