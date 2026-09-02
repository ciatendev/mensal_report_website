"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

// Definições de tipos e dados fixos
type Registro = {
  id: string;
  equipe: string;
  indicador_key: string;
  indicador: string;
  nome: string;
  tipo?: string;
  status?: string;
  evidencia?: string;
  validado: "Pendente" | "Sim" | "Não" | "Ajuste solicitado";
  nota_validacao?: string;
};

const EQUIPES = [
  "Lilian e Antônio", "Olívia e Gabriel", "Márcio e Malvina",
  "Vagner e Regiane", "Vinícius, Kelson e Victor", "Victor Barbosa",
  "Dorcas e Andressa", "Fábio e Roni", "Ângelo e Anathália"
];

const INDICADORES: Record<string, string> = {
  politicas: "Documento de recomendação para políticas públicas",
  publicacoes: "Número de publicações científicas",
  cursos: "Número de cursos, eventos científicos ou outras ações realizadas por período",
  tecnologia: "Número de projetos voltados ao desenvolvimento de fármacos e tecnologias",
  divulgacao: "Alcance de Divulgação nas Redes Sociais",
  recursos: "Captação de Recursos para Pesquisa, Inovação e Eventos"
};

export default function AnnualActionsReportPage() {
  const [activeTab, setActiveTab] = useState<string>("registro");
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [equipeSel, setEquipeSel] = useState<string>("");
  const [indicadorSel, setIndicadorSel] = useState<string>("");
  const [nome, setNome] = useState<string>("");
  const [evidencia, setEvidencia] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicadorSel || !equipeSel) return;

    const novoRegistro: Registro = {
      id: Date.now().toString(),
      equipe: equipeSel,
      indicador_key: indicadorSel,
      indicador: INDICADORES[indicadorSel],
      nome,
      evidencia,
      validado: "Pendente"
    };

    setRegistros((prev) => [...prev, novoRegistro]);
    setNome("");
    setEvidencia("");
    alert("Registro enviado com sucesso para validação!");
  };

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Topo / Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">CIATEN — Registro de Resultados 2026</h1>
            <p className="text-sm text-slate-500">Formulário enxuto: apenas o que é necessário para contar, validar e comprovar.</p>
          </div>
          
          {/* Navegação por Abas */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "registro", label: "Novo registro" },
              { id: "meus-registros", label: "Meus registros" },
              { id: "validacao", label: "Validação" },
              { id: "resultados-equipe", label: "Resultados por Equipe" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg border transition ${
                  activeTab === tab.id
                    ? "bg-sky-800 text-white border-sky-800"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo: Aba Novo Registro */}
        {activeTab === "registro" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-semibold border-b border-slate-100 pb-2">Novo Registro</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Equipe *</label>
                  <select
                    value={equipeSel}
                    onChange={(e) => setEquipeSel(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-sky-600"
                  >
                    <option value="">Selecione...</option>
                    {EQUIPES.map((eq) => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Indicador *</label>
                  <select
                    value={indicadorSel}
                    onChange={(e) => setIndicadorSel(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-sky-600"
                  >
                    <option value="">Selecione...</option>
                    {Object.entries(INDICADORES).map(([key, value]) => (
                      <option key={key} value={key}>{value}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">Nome do produto/atividade *</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex.: Mapa de Evidências sobre Raiva"
                    required
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-sky-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold mb-1">Evidência / Link URL *</label>
                  <input
                    type="url"
                    value={evidencia}
                    onChange={(e) => setEvidencia(e.target.value)}
                    placeholder="https://"
                    required
                    className="w-full border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-sky-600"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-sky-800 text-white font-semibold rounded-lg hover:bg-sky-900 transition"
                >
                  Enviar registro
                </button>

                {/* Botão de Sair ajustado para usar onClick (sem tag form aninhada) */}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="px-5 py-2.5 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition"
                >
                  Sair
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Conteúdo: Outras Abas */}
        {activeTab !== "registro" && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center py-12">
            <h3 className="text-lg font-semibold text-slate-700">Seção em exibição: {activeTab}</h3>
            <p className="text-sm text-slate-500 mt-1">Registros cadastrados no momento: {registros.length}</p>
          </div>
        )}

      </div>
    </main>
  );
}