"use client";

import { useState, useMemo } from "react";
import { signOut } from "next-auth/react";

// Types
type Registro = {
  id: string;
  timestamp: string;
  ano: number;
  equipe: string;
  indicador_key: string;
  indicador: string;
  nome: string;
  tipo?: string;
  status?: string;
  evidencia?: string;
  data_realizacao?: string;
  participantes?: string;
  canal?: string;
  alcance?: string;
  financiador?: string;
  valor_aprovado?: string;
  moeda?: string;
  validado: "Pendente" | "Sim" | "Não" | "Ajuste solicitado";
  nota_validacao?: string;
  data_validacao?: string;
  ultima_edicao?: string;
};

// Dados auxiliares de listas e domínios
const EQUIPES = [
  "Lilian e Antônio", "Olívia e Gabriel", "Márcio e Malvina",
  "Vagner e Regiane", "Vinícius, Kelson e Victor", "Victor Barbosa",
  "Dorcas e Andressa", "Fábio e Roni", "Ângelo e Anathália"
];

const INDICADORES: Record<string, string> = {
  politicas: "Documento de recomendação para políticas públicas",
  publicacoes: "Número de publicações científicas",
  cursos: "Número de cursos, eventos científicos ou outras ações realizadas por período",
  tecnologia: "Número de projetos voltados ao desenvolvimento de fármacos, dispositivos biotecnológicos e outras tecnologias",
  divulgacao: "Alcance de Divulgação nas Redes Sociais",
  recursos: "Captação de Recursos para Pesquisa, Inovação e Eventos"
};

const TIPOS: Record<string, string[]> = {
  politicas: ["Mapa de evidências", "Síntese de Evidências para Políticas – SEP", "Nota técnica", "Relatório técnico", "Documento de recomendação", "Plano de ação", "Protocolo", "Diretriz", "Outro"],
  publicacoes: ["Artigo", "Preprint", "Capítulo de livro", "Livro", "Relatório técnico com ISSN/ISBN", "Outro"],
  cursos: ["Curso", "Oficina", "Workshop", "Seminário", "Congresso", "Webinar", "Capacitação", "Campanha educativa/formativa", "Outra ação"],
  tecnologia: ["Software", "Sistema", "Dashboard/painel", "Chatbot", "Aplicativo", "Linha de cuidado digital", "Biobanco", "Dispositivo", "Produto biotecnológico", "Protótipo", "Outro"],
  divulgacao: ["Post", "Reel", "Story", "Vídeo", "Entrevista", "Matéria", "Campanha", "Podcast", "Outro"]
};

const STATUSES: Record<string, string[]> = {
  politicas: ["Planejado", "Em andamento", "Concluído", "Cancelado"],
  publicacoes: ["Em elaboração", "Submetido", "Aceito", "Publicado"],
  cursos: ["Planejado", "Em andamento", "Concluído", "Cancelado"],
  tecnologia: ["Ideação", "Desenvolvimento", "Protótipo funcional", "Piloto", "Implementado"],
  recursos: ["Em elaboração", "Submetido", "Em análise", "Aprovado", "Não aprovado", "Recurso recebido"]
};

const CANAIS = ["Instagram CIATEN", "Instagram parceiro", "YouTube", "Site", "TV", "Rádio", "Podcast", "Imprensa escrita/digital", "Outro"];

export default function AnnualActionsReportPage() {
  const [activeTab, setActiveTab] = useState<string>("registro");
  const [registros, setRegistros] = useState<Registro[]>([]);
  
  // Formulário Principal
  const [editingId, setEditingId] = useState<string | null>(null);
  const [equipeSel, setEquipeSel] = useState<string>("");
  const [indicadorSel, setIndicadorSel] = useState<string>("");
  const [nome, setNome] = useState<string>("");
  
  // Campos Dinâmicos do Formulário
  const [tipo, setTipo] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [evidencia, setEvidencia] = useState<string>("");
  const [dataRealizacao, setDataRealizacao] = useState<string>("");
  const [participantes, setParticipantes] = useState<string>("");
  const [canal, setCanal] = useState<string>("");
  const [alcance, setAlcance] = useState<string>("");
  const [financiador, setFinanciador] = useState<string>("");
  const [valorAprovado, setValorAprovado] = useState<string>("");
  const [moeda, setMoeda] = useState<string>("BRL");

  // Filtro e Validação
  const [filtroEquipe, setFiltroEquipe] = useState<string>("");
  const [ajusteTex, setAjusteTex] = useState<Record<string, string>>({});
  const [openAjusteId, setOpenAjusteId] = useState<string | null>(null);
  const [ajusteError, setAjusteError] = useState<string | null>(null);

  // Modal de Detalhamento
  const [modalData, setModalData] = useState<{ key: string; equipe: string } | null>(null);

  // Reset do formulário
  const resetForm = () => {
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
  };

  // Preencher Edição
  const preencherEdicao = (id: string) => {
    const r = registros.find((x) => x.id === id);
    if (!r) return;
    setEditingId(id);
    setActiveTab("registro");
    setEquipeSel(r.equipe);
    setIndicadorSel(r.indicador_key);
    setNome(r.nome);
    setTipo(r.tipo || "");
    setStatus(r.status || "");
    setEvidencia(r.evidencia || "");
    setDataRealizacao(r.data_realizacao || "");
    setParticipantes(r.participantes || "");
    setCanal(r.canal || "");
    setAlcance(r.alcance || "");
    setFinanciador(r.financiador || "");
    setValorAprovado(r.valor_aprovado || "");
    setMoeda(r.moeda || "BRL");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Salvar / Enviar Formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicadorSel || !equipeSel) return;

    const now = new Date().toISOString();

    if (editingId) {
      setRegistros((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
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
              }
            : r
        )
      );
      alert("Correção reenviada. O registro voltou para a validação da coordenação.");
    } else {
      const novoRegistro: Registro = {
        id: Date.now().toString(),
        timestamp: now,
        ano: 2026,
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
      setRegistros((prev) => [...prev, novoRegistro]);
      alert("Registro enviado. A coordenação fará a validação.");
    }
    resetForm();
  };

  // Ações de Validação
  const validarRegistro = (id: string, statusVal: Registro["validado"], nota: string = "") => {
    setRegistros((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              validado: statusVal,
              nota_validacao: nota,
              data_validacao: new Date().toISOString(),
            }
          : r
      )
    );
    setOpenAjusteId(null);
    setAjusteError(null);
  };

  // Contabilização idêntica ao JS do HTML
  const contabiliza = (r: Registro) => {
    if (r.validado !== "Sim" || !r.evidencia) return 0;
    const k = r.indicador_key;
    const s = r.status;
    if (k === "politicas" || k === "cursos") return s === "Concluído" ? 1 : 0;
    if (k === "publicacoes") return ["Aceito", "Publicado"].includes(s || "") ? 1 : 0;
    if (k === "tecnologia") return ["Piloto", "Implementado"].includes(s || "") ? 1 : 0;
    if (k === "divulgacao") return 1;
    if (k === "recursos") return ["Aprovado", "Recurso recebido"].includes(s || "") ? 1 : 0;
    return 0;
  };

  // Cálculos consolidados para a aba de Resultados
  const resumo = useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    EQUIPES.forEach((e) => {
      out[e] = { politicas: 0, publicacoes: 0, cursos: 0, tecnologia: 0, divulgacao: 0, recursos: 0 };
    });

    registros.forEach((r) => {
      if (!out[r.equipe] || !contabiliza(r)) return;
      if (r.indicador_key === "divulgacao") {
        out[r.equipe].divulgacao += Number(r.alcance || 0);
      } else if (r.indicador_key === "recursos" && r.moeda === "BRL") {
        out[r.equipe].recursos += Number(r.valor_aprovado || 0);
      } else if (r.indicador_key !== "recursos") {
        out[r.equipe][r.indicador_key]++;
      }
    });

    return out;
  }, [registros]);

  const totais = useMemo(() => {
    const t = { politicas: 0, publicacoes: 0, cursos: 0, tecnologia: 0, divulgacao: 0, recursos: 0 };
    Object.values(resumo).forEach((v) => {
      Object.keys(t).forEach((k) => {
        t[k as keyof typeof t] += v[k] || 0;
      });
    });
    return t;
  }, [resumo]);

  const usdTotal = useMemo(() => {
    return registros
      .filter((r) => contabiliza(r) && r.indicador_key === "recursos" && r.moeda === "USD")
      .reduce((a, r) => a + Number(r.valor_aprovado || 0), 0);
  }, [registros]);

  const registrosModal = useMemo(() => {
    if (!modalData) return [];
    return registros.filter(
      (r) =>
        contabiliza(r) &&
        r.indicador_key === modalData.key &&
        (!modalData.equipe || r.equipe === modalData.equipe)
    );
  }, [registros, modalData]);

  // Exportar CSV
  const exportCsv = () => {
    if (!registros.length) return;
    const cols = Array.from(new Set(registros.flatMap((o) => Object.keys(o))));
    const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csvContent = [
      cols.map(q).join(","),
      ...registros.map((r) => cols.map((c) => q((r as any)[c])).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ciaten_registros_2026.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendentesList = registros.filter((r) => !r.validado || r.validado === "Pendente").reverse();
  const historicoList = registros.filter((r) => r.validado && r.validado !== "Pendente").reverse();

  return (
    <main className="min-h-screen bg-[#f4f7fb] py-8 px-4 font-sans text-[#18324a]">
      <div className="max-w-[920px] mx-auto space-y-4">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold m-0 text-[#18324a]">CIATEN — Registro de Resultados 2026</h1>
            <p className="text-sm text-[#687b8d] mt-1 m-0">
              Formulário enxuto: apenas o que é necessário para contar, validar e comprovar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "registro", label: "Novo registro" },
              { id: "meus-registros", label: "Meus registros" },
              { id: "validacao", label: "Validação" },
              { id: "resultados-equipe", label: "Resultados por Equipe" },
              { id: "resultados-ciaten", label: "Resultados do CIATEN" },
            ].map((tab) => (
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

        {/* ABA: REGISTRO */}
        {activeTab === "registro" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            {editingId && (
              <div className="border border-[#f0d692] bg-[#fff8e7] text-[#795d13] rounded-[11px] p-3 flex justify-between items-center gap-3">
                <div>
                  <b>Corrigindo um registro devolvido.</b>
                  <div className="text-xs text-[#687b8d]">Faça o ajuste e reenvie. O mesmo registro voltará para a fila de validação.</div>
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

            {/* Campos Específicos por Indicador */}
            {indicadorSel === "politicas" && (
              <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] space-y-3">
                <h2 className="text-lg font-bold m-0">Políticas públicas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold mb-1">Tipo de produto *</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                      <option value="">Selecione</option>
                      {TIPOS.politicas.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Situação *</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                      <option value="">Selecione</option>
                      {STATUSES.politicas.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-1">Evidência/link *</label>
                    <input type="url" value={evidencia} onChange={(e) => setEvidencia(e.target.value)} required placeholder="https://" className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
                  </div>
                </div>
              </div>
            )}

            {indicadorSel === "publicacoes" && (
              <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] space-y-3">
                <h2 className="text-lg font-bold m-0">Publicação científica</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold mb-1">Tipo *</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                      <option value="">Selecione</option>
                      {TIPOS.publicacoes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Situação *</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                      <option value="">Selecione</option>
                      {STATUSES.publicacoes.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-1">DOI ou link *</label>
                    <input type="url" value={evidencia} onChange={(e) => setEvidencia(e.target.value)} required placeholder="https://" className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
                  </div>
                </div>
              </div>
            )}

            {indicadorSel === "cursos" && (
              <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] space-y-3">
                <h2 className="text-lg font-bold m-0">Curso, evento ou ação</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold mb-1">Tipo *</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                      <option value="">Selecione</option>
                      {TIPOS.cursos.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Situação *</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                      <option value="">Selecione</option>
                      {STATUSES.cursos.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Data da realização</label>
                    <input type="date" value={dataRealizacao} onChange={(e) => setDataRealizacao(e.target.value)} className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Nº de participantes</label>
                    <input type="number" min="0" value={participantes} onChange={(e) => setParticipantes(e.target.value)} placeholder="Opcional" className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-1">Evidência/link *</label>
                    <input type="url" value={evidencia} onChange={(e) => setEvidencia(e.target.value)} required placeholder="https://" className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
                  </div>
                </div>
              </div>
            )}

            {indicadorSel === "tecnologia" && (
              <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] space-y-3">
                <h2 className="text-lg font-bold m-0">Tecnologia e inovação</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold mb-1">Tipo *</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                      <option value="">Selecione</option>
                      {TIPOS.tecnologia.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Estágio atual *</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                      <option value="">Selecione</option>
                      {STATUSES.tecnologia.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-1">Evidência/link *</label>
                    <input type="url" value={evidencia} onChange={(e) => setEvidencia(e.target.value)} required placeholder="https://" className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
                  </div>
                </div>
              </div>
            )}

            {indicadorSel === "divulgacao" && (
              <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] space-y-3">
                <h2 className="text-lg font-bold m-0">Divulgação</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold mb-1">Canal *</label>
                    <select value={canal} onChange={(e) => setCanal(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                      <option value="">Selecione</option>
                      {CANAIS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Tipo de conteúdo *</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                      <option value="">Selecione</option>
                      {TIPOS.divulgacao.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Alcance</label>
                    <input type="number" min="0" value={alcance} onChange={(e) => setAlcance(e.target.value)} placeholder="Se disponível" className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Link *</label>
                    <input type="url" value={evidencia} onChange={(e) => setEvidencia(e.target.value)} required placeholder="https://" className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
                  </div>
                </div>
              </div>
            )}

            {indicadorSel === "recursos" && (
              <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] space-y-3">
                <h2 className="text-lg font-bold m-0">Captação de recursos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold mb-1">Instituição financiadora *</label>
                    <input type="text" value={financiador} onChange={(e) => setFinanciador(e.target.value)} required placeholder="Ex.: FAPEPI" className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1">Situação *</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                      <option value="">Selecione</option>
                      {STATUSES.recursos.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {["Aprovado", "Recurso recebido"].includes(status) && (
                    <>
                      <div>
                        <label className="block text-sm font-bold mb-1">Valor aprovado *</label>
                        <input type="number" step="0.01" min="0" value={valorAprovado} onChange={(e) => setValorAprovado(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-1">Moeda *</label>
                        <select value={moeda} onChange={(e) => setMoeda(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                          <option value="BRL">BRL</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="Outra">Outra</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold mb-1">Evidência/link *</label>
                    <input type="url" value={evidencia} onChange={(e) => setEvidencia(e.target.value)} required placeholder="https://" className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
                  </div>
                </div>
              </div>
            )}

            {/* Painel de ações do formulário */}
            <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] space-y-3">
              <div className="text-xs text-[#687b8d]">
                ID, data/hora, ano, contabilização e validação são automáticos e não aparecem para a equipe.
              </div>
              <div className="flex gap-2.5 flex-wrap">
                <button type="submit" className="px-4 py-2.5 bg-[#1f5f8b] text-white font-bold rounded-[10px]">
                  {editingId ? "Reenviar para validação" : "Enviar registro"}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2.5 bg-white border border-[#dbe4ec] font-bold rounded-[10px]">
                  Limpar
                </button>
                <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="px-4 py-2.5 bg-[#e9f2f8] text-[#1f5f8b] font-bold rounded-[10px]">
                  Sair
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ABA: MEUS REGISTROS */}
        {activeTab === "meus-registros" && (
          <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-end gap-3 border-b border-[#dbe4ec] pb-3">
              <div>
                <h2 className="text-lg font-bold m-0">Meus registros</h2>
                <p className="text-xs text-[#687b8d] mt-1 m-0">Consulte o que foi enviado e corrija apenas os registros devolvidos pela coordenação.</p>
              </div>
              <div className="min-w-[280px]">
                <label className="block text-xs font-bold mb-1">Equipe</label>
                <select value={filtroEquipe} onChange={(e) => setFiltroEquipe(e.target.value)} className="w-full border border-[#dbe4ec] rounded-[10px] p-2 bg-white text-sm">
                  <option value="">Selecione sua equipe</option>
                  {EQUIPES.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            {!filtroEquipe ? (
              <div className="text-center py-6 text-[#687b8d]">Selecione sua equipe para consultar os registros.</div>
            ) : (
              <div className="space-y-6">
                {/* Precisa de Ajuste */}
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2 mb-2">
                    Precisa de ajuste
                    <span className="bg-[#fff4d6] text-[#8b6200] px-2 py-0.5 rounded-full text-xs font-bold">
                      {registros.filter((r) => r.equipe === filtroEquipe && r.validado === "Ajuste solicitado").length}
                    </span>
                  </h3>
                  {registros
                    .filter((r) => r.equipe === filtroEquipe && r.validado === "Ajuste solicitado")
                    .map((r) => (
                      <div key={r.id} className="border border-[#dbe4ec] rounded-[12px] p-3.5 bg-white flex justify-between items-start gap-3 mb-2">
                        <div>
                          <div className="font-extrabold">{r.nome}</div>
                          <div className="flex gap-2 items-center text-xs text-[#687b8d] mt-1">
                            <span className="bg-[#fff4d6] text-[#8b6200] px-2 py-0.5 rounded-full font-bold">{r.validado}</span>
                            <span>{r.indicador}</span>
                          </div>
                          {r.nota_validacao && (
                            <div className="mt-2 p-2 bg-[#fff8e7] text-[#795d13] text-xs rounded-[9px]">
                              <b>Ajuste solicitado:</b> {r.nota_validacao}
                            </div>
                          )}
                          {r.evidencia && (
                            <a href={r.evidencia} target="_blank" rel="noreferrer" className="text-xs text-[#1f5f8b] font-bold mt-2 inline-block">
                              ↗ Evidência
                            </a>
                          )}
                        </div>
                        <button onClick={() => preencherEdicao(r.id)} className="px-3 py-1.5 text-xs bg-[#e9f2f8] text-[#1f5f8b] font-bold rounded-[8px]">
                          Editar e reenviar
                        </button>
                      </div>
                    ))}
                </div>

                {/* Aguardando Validação */}
                <div>
                  <details open>
                    <summary className="cursor-pointer font-bold border-b border-[#dbe4ec] pb-1">
                      Aguardando validação ({registros.filter((r) => r.equipe === filtroEquipe && (!r.validado || r.validado === "Pendente")).length})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {registros
                        .filter((r) => r.equipe === filtroEquipe && (!r.validado || r.validado === "Pendente"))
                        .map((r) => (
                          <div key={r.id} className="border border-[#dbe4ec] rounded-[12px] p-3.5 bg-white">
                            <div className="font-extrabold">{r.nome}</div>
                            <div className="flex gap-2 items-center text-xs text-[#687b8d] mt-1">
                              <span className="bg-[#fff4d6] text-[#8b6200] px-2 py-0.5 rounded-full font-bold">Pendente</span>
                              <span>{r.indicador}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </details>
                </div>

                {/* Já Analisados */}
                <div>
                  <details>
                    <summary className="cursor-pointer font-bold border-b border-[#dbe4ec] pb-1">
                      Já analisados ({registros.filter((r) => r.equipe === filtroEquipe && ["Sim", "Não"].includes(r.validado)).length})
                    </summary>
                    <div className="mt-2 space-y-2">
                      {registros
                        .filter((r) => r.equipe === filtroEquipe && ["Sim", "Não"].includes(r.validado))
                        .map((r) => (
                          <div key={r.id} className="border border-[#dbe4ec] rounded-[12px] p-3.5 bg-white">
                            <div className="font-extrabold">{r.nome}</div>
                            <div className="flex gap-2 items-center text-xs text-[#687b8d] mt-1">
                              <span className={`px-2 py-0.5 rounded-full font-bold ${r.validado === "Sim" ? "bg-[#e7f6ef] text-[#1b7f5a]" : "bg-[#fdeaea] text-[#a13b3b]"}`}>
                                {r.validado === "Sim" ? "Aprovado" : "Não contabilizado"}
                              </span>
                              <span>{r.indicador}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA: VALIDAÇÃO */}
        {activeTab === "validacao" && (
          <div className="space-y-4">
            <div className="flex justify-between items-end gap-4 border-b border-[#dbe4ec] pb-3">
              <div>
                <h2 className="text-lg font-bold m-0">Validação da coordenação</h2>
                <p className="text-xs text-[#687b8d] mt-1 m-0">Revise a evidência e decida se o registro entra nos indicadores institucionais.</p>
              </div>
              <div className="text-center border border-[#dbe4ec] bg-white rounded-[12px] px-3 py-2 min-w-[92px]">
                <b className="block text-2xl text-[#1f5f8b]">{pendentesList.length}</b>
                <span className="text-xs text-[#687b8d]">pendentes</span>
              </div>
            </div>

            <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] space-y-3">
              <h3 className="text-base font-bold m-0">Aguardando decisão</h3>
              {!pendentesList.length ? (
                <div className="text-center py-6 text-[#687b8d]">Nenhum registro aguardando validação.</div>
              ) : (
                <div className="space-y-3">
                  {pendentesList.map((r) => (
                    <article key={r.id} className="border border-[#dbe4ec] rounded-[12px] p-4 bg-white space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-extrabold text-base">{r.nome}</div>
                          <div className="flex gap-2 flex-wrap items-center text-xs mt-1">
                            <span className="bg-[#fff4d6] text-[#8b6200] px-2 py-0.5 rounded-full font-bold">{r.equipe}</span>
                            <span className="text-[#687b8d]">{r.indicador}</span>
                            {r.tipo && <span className="text-[#687b8d]">• {r.tipo}</span>}
                          </div>
                        </div>
                        <span className="bg-[#fff4d6] text-[#8b6200] px-2 py-0.5 rounded-full text-xs font-bold">{r.status || "—"}</span>
                      </div>

                      <div>
                        {r.evidencia ? (
                          <a href={r.evidencia} target="_blank" rel="noreferrer" className="text-xs text-[#1f5f8b] font-bold">
                            ↗ Abrir evidência
                          </a>
                        ) : (
                          <span className="text-xs text-[#687b8d]">Sem evidência informada</span>
                        )}
                      </div>

                      <div className="flex gap-2 flex-wrap border-t border-[#dbe4ec] pt-3">
                        <button onClick={() => validarRegistro(r.id, "Sim")} className="px-3 py-1.5 text-xs bg-[#e7f6ef] text-[#1b7f5a] font-bold rounded-[8px]">
                          ✓ Aprovar
                        </button>
                        <button onClick={() => setOpenAjusteId(openAjusteId === r.id ? null : r.id)} className="px-3 py-1.5 text-xs bg-[#fff4d6] text-[#8b6200] font-bold rounded-[8px]">
                          ↶ Solicitar ajuste
                        </button>
                        <button onClick={() => validarRegistro(r.id, "Não")} className="px-3 py-1.5 text-xs bg-[#fdeaea] text-[#a13b3b] font-bold rounded-[8px]">
                          ✕ Não contabilizar
                        </button>
                      </div>

                      {openAjusteId === r.id && (
                        <div className="p-3 border border-[#dbe4ec] bg-[#fff8e7] rounded-[10px] space-y-2">
                          <label className="block text-xs font-bold">O que precisa ser ajustado?</label>
                          <textarea
                            value={ajusteTex[r.id] || ""}
                            onChange={(e) => setAjusteTex({ ...ajusteTex, [r.id]: e.target.value })}
                            placeholder="Ex.: inserir o link da evidência ou corrigir o tipo de produto."
                            className="w-full border border-[#dbe4ec] rounded-[9px] p-2 text-sm bg-white min-h-[80px]"
                          />
                          {ajusteError && <div className="text-xs text-[#a13b3b] font-bold">{ajusteError}</div>}
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (!ajusteTex[r.id]?.trim()) {
                                  setAjusteError("Escreva uma orientação para a equipe.");
                                  return;
                                }
                                validarRegistro(r.id, "Ajuste solicitado", ajusteTex[r.id]);
                              }}
                              className="px-3 py-1.5 text-xs bg-[#fff4d6] text-[#8b6200] font-bold rounded-[8px]"
                            >
                              Enviar solicitação
                            </button>
                            <button onClick={() => setOpenAjusteId(null)} className="px-3 py-1.5 text-xs bg-white border border-[#dbe4ec] font-bold rounded-[8px]">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Histórico */}
            <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)]">
              <details>
                <summary className="cursor-pointer font-bold">
                  Histórico de validação <span className="text-xs text-[#687b8d]">({historicoList.length})</span>
                </summary>
                <div className="mt-3 space-y-2">
                  {!historicoList.length ? (
                    <div className="text-center py-4 text-[#687b8d] text-sm">Ainda não há histórico.</div>
                  ) : (
                    historicoList.map((r) => (
                      <div key={r.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b border-[#dbe4ec] pb-2 text-sm">
                        <div>
                          <b>{r.nome}</b>
                          <div className="text-xs text-[#687b8d]">{r.equipe} · {r.indicador}</div>
                          {r.nota_validacao && (
                            <div className="text-xs p-1.5 bg-[#fff8e7] text-[#795d13] rounded mt-1">{r.nota_validacao}</div>
                          )}
                        </div>
                        <div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.validado === "Sim" ? "bg-[#e7f6ef] text-[#1b7f5a]" : r.validado === "Não" ? "bg-[#fdeaea] text-[#a13b3b]" : "bg-[#fff4d6] text-[#8b6200]"}`}>
                            {r.validado}
                          </span>
                        </div>
                        <div>
                          <button onClick={() => validarRegistro(r.id, "Pendente")} className="px-2 py-1 text-xs bg-white border border-[#dbe4ec] font-bold rounded">
                            Reabrir
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </details>
            </div>
          </div>
        )}

        {/* ABA: RESULTADOS POR EQUIPE */}
        {activeTab === "resultados-equipe" && (
          <div className="space-y-4">
            {/* Cards KPI */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ["Documentos", totais.politicas, "politicas"],
                ["Publicações", totais.publicacoes, "publicacoes"],
                ["Cursos/eventos", totais.cursos, "cursos"],
                ["Tecnologias", totais.tecnologia, "tecnologia"],
              ].map(([title, val, key]) => (
                <div key={key as string} className="bg-white border border-[#dbe4ec] rounded-[12px] p-4">
                  <span className="text-xs text-[#687b8d] block">{title}</span>
                  <button
                    onClick={() => setModalData({ key: key as string, equipe: "" })}
                    disabled={Number(val) === 0}
                    className="text-2xl font-extrabold text-[#1f5f8b] underline disabled:no-underline disabled:text-[#687b8d]"
                  >
                    {val}
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] overflow-x-auto">
              <h2 className="text-lg font-bold mb-3">Resultados por Equipe</h2>
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#f7fafc] border-b border-[#dbe4ec]">
                    <th className="p-2.5">Equipe</th>
                    <th className="p-2.5">Políticas</th>
                    <th className="p-2.5">Publicações</th>
                    <th className="p-2.5">Cursos/eventos</th>
                    <th className="p-2.5">Tecnologias</th>
                    <th className="p-2.5">Alcance</th>
                    <th className="p-2.5">Recursos BRL</th>
                  </tr>
                </thead>
                <tbody>
                  {EQUIPES.map((eq) => (
                    <tr key={eq} className="border-b border-[#dbe4ec]">
                      <td className="p-2.5 font-semibold">{eq}</td>
                      <td className="p-2.5">
                        <button onClick={() => setModalData({ key: "politicas", equipe: eq })} disabled={!resumo[eq].politicas} className="text-[#1f5f8b] font-extrabold underline disabled:no-underline disabled:text-[#687b8d]">
                          {resumo[eq].politicas}
                        </button>
                      </td>
                      <td className="p-2.5">
                        <button onClick={() => setModalData({ key: "publicacoes", equipe: eq })} disabled={!resumo[eq].publicacoes} className="text-[#1f5f8b] font-extrabold underline disabled:no-underline disabled:text-[#687b8d]">
                          {resumo[eq].publicacoes}
                        </button>
                      </td>
                      <td className="p-2.5">
                        <button onClick={() => setModalData({ key: "cursos", equipe: eq })} disabled={!resumo[eq].cursos} className="text-[#1f5f8b] font-extrabold underline disabled:no-underline disabled:text-[#687b8d]">
                          {resumo[eq].cursos}
                        </button>
                      </td>
                      <td className="p-2.5">
                        <button onClick={() => setModalData({ key: "tecnologia", equipe: eq })} disabled={!resumo[eq].tecnologia} className="text-[#1f5f8b] font-extrabold underline disabled:no-underline disabled:text-[#687b8d]">
                          {resumo[eq].tecnologia}
                        </button>
                      </td>
                      <td className="p-2.5">
                        <button onClick={() => setModalData({ key: "divulgacao", equipe: eq })} disabled={!resumo[eq].divulgacao} className="text-[#1f5f8b] font-extrabold underline disabled:no-underline disabled:text-[#687b8d]">
                          {resumo[eq].divulgacao.toLocaleString("pt-BR")}
                        </button>
                      </td>
                      <td className="p-2.5">
                        <button onClick={() => setModalData({ key: "recursos", equipe: eq })} disabled={!resumo[eq].recursos} className="text-[#1f5f8b] font-extrabold underline disabled:no-underline disabled:text-[#687b8d]">
                          {resumo[eq].recursos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t-2 border-[#dbe4ec]">
                    <td className="p-2.5">Total</td>
                    <td className="p-2.5">{totais.politicas}</td>
                    <td className="p-2.5">{totais.publicacoes}</td>
                    <td className="p-2.5">{totais.cursos}</td>
                    <td className="p-2.5">{totais.tecnologia}</td>
                    <td className="p-2.5">{totais.divulgacao.toLocaleString("pt-BR")}</td>
                    <td className="p-2.5">{totais.recursos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA: RESULTADOS DO CIATEN */}
        {activeTab === "resultados-ciaten" && (
          <div className="space-y-4">
            <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] overflow-x-auto">
              <h2 className="text-lg font-bold mb-3">Síntese de indicadores e principais resultados do CIATEN, 2026</h2>
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#f7fafc] border-b border-[#dbe4ec]">
                    <th className="p-2.5">Indicador</th>
                    <th className="p-2.5">O que mede</th>
                    <th className="p-2.5">Como é calculated</th>
                    <th className="p-2.5">2026</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  <tr className="border-b border-[#dbe4ec]">
                    <td className="p-2.5 font-bold">Documentos para políticas públicas</td>
                    <td className="p-2.5">Capacidade do CIATEN de produzir evidências aplicáveis à tomada de decisão.</td>
                    <td className="p-2.5">Contagem de documentos concluídos e validados.</td>
                    <td className="p-2.5 font-bold text-[#1f5f8b]">{totais.politicas} documentos</td>
                  </tr>
                  <tr className="border-b border-[#dbe4ec]">
                    <td className="p-2.5 font-bold">Publicações científicas</td>
                    <td className="p-2.5">Produção de conhecimento técnico-científico.</td>
                    <td className="p-2.5">Contagem de publicações aceitas ou publicadas.</td>
                    <td className="p-2.5 font-bold text-[#1f5f8b]">{totais.publicacoes} publicações</td>
                  </tr>
                  <tr className="border-b border-[#dbe4ec]">
                    <td className="p-2.5 font-bold">Cursos, eventos e ações</td>
                    <td className="p-2.5">Atividades formativas que qualificam profissionais.</td>
                    <td className="p-2.5">Contagem de cursos/eventos validados.</td>
                    <td className="p-2.5 font-bold text-[#1f5f8b]">{totais.cursos} ações formativas</td>
                  </tr>
                  <tr className="border-b border-[#dbe4ec]">
                    <td className="p-2.5 font-bold">Projetos tecnológicos</td>
                    <td className="p-2.5">Iniciativas que envolvem criação ou aprimoramento de tecnologias.</td>
                    <td className="p-2.5">Contagem de projetos em piloto ou implementação.</td>
                    <td className="p-2.5 font-bold text-[#1f5f8b]">{totais.tecnologia} projetos tecnológicos</td>
                  </tr>
                  <tr className="border-b border-[#dbe4ec]">
                    <td className="p-2.5 font-bold">Alcance nas redes sociais</td>
                    <td className="p-2.5">Impacto e visibilidade do CIATEN.</td>
                    <td className="p-2.5">Soma do alcance informado nos registros.</td>
                    <td className="p-2.5 font-bold text-[#1f5f8b]">{totais.divulgacao.toLocaleString("pt-BR")} de alcance</td>
                  </tr>
                  <tr className="border-b border-[#dbe4ec]">
                    <td className="p-2.5 font-bold">Captação de recursos</td>
                    <td className="p-2.5">Capacidade de mobilização financeira.</td>
                    <td className="p-2.5">Soma dos valores aprovados nos registros.</td>
                    <td className="p-2.5 font-bold text-[#1f5f8b]">
                      {totais.recursos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      {usdTotal > 0 && ` + US$ ${usdTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] flex gap-2">
              <button onClick={exportCsv} className="px-4 py-2 bg-[#e9f2f8] text-[#1f5f8b] font-bold rounded-[10px]">
                Exportar CSV
              </button>
              <button
                onClick={() => {
                  if (confirm("Apagar todos os registros locais?")) {
                    setRegistros([]);
                  }
                }}
                className="px-4 py-2 bg-white border border-[#dbe4ec] text-[#a13b3b] font-bold rounded-[10px]"
              >
                Limpar dados locais
              </button>
            </div>
          </div>
        )}

        {/* MODAL / DETALHAMENTO */}
        {modalData && (
          <div className="fixed inset-0 bg-[#0f2332]/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-[#dbe4ec] rounded-[16px] max-w-[760px] w-full max-h-[82vh] overflow-y-auto p-5 shadow-2xl">
              <div className="flex justify-between items-start gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold m-0">{INDICADORES[modalData.key] || modalData.key}</h2>
                  <div className="text-xs text-[#687b8d]">
                    {modalData.equipe ? `${modalData.equipe} • ` : "CIATEN 2026 • "}
                    {registrosModal.length} registro(s) contabilizado(s)
                  </div>
                </div>
                <button onClick={() => setModalData(null)} className="border border-[#dbe4ec] rounded-[9px] px-3 py-1 font-bold text-sm">
                  Fechar
                </button>
              </div>

              <div className="space-y-2">
                {!registrosModal.length ? (
                  <div className="text-center py-6 text-[#687b8d]">Nenhum registro contabilizado neste indicador.</div>
                ) : (
                  registrosModal.map((r) => (
                    <div key={r.id} className="border border-[#dbe4ec] rounded-[12px] p-3.5 bg-white space-y-1">
                      <b className="block">{r.nome}</b>
                      <div className="text-xs text-[#687b8d] flex gap-2 flex-wrap">
                        <span>{r.equipe}</span>
                        {r.tipo && <span>• {r.tipo}</span>}
                        <span>• {r.status || "Publicado"}</span>
                        {r.valor_aprovado && (
                          <span>
                            • {Number(r.valor_aprovado).toLocaleString("pt-BR", { style: "currency", currency: r.moeda || "BRL" })}
                          </span>
                        )}
                        {r.alcance && <span>• Alcance: {Number(r.alcance).toLocaleString("pt-BR")}</span>}
                      </div>
                      {r.financiador && <div className="text-xs text-[#687b8d]">Financiador: {r.financiador}</div>}
                      {r.evidencia && (
                        <a href={r.evidencia} target="_blank" rel="noreferrer" className="text-xs text-[#1f5f8b] font-bold block mt-1">
                          Abrir evidência ↗
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <footer className="text-center text-xs text-[#687b8d] mt-6">
          Protótipo enxuto CIATEN 2026.
        </footer>
      </div>
    </main>
  );
}