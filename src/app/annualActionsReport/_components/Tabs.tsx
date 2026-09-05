/**
 * Tabs.tsx — Abas: Meus Registros, Validação, Resultados por Equipe,
 *            Tabela 1 (Síntese CIATEN), Tabela 2 (por Núcleo), Modal.
 *
 * Todas as tabelas usam:
 *   - table-auto  → colunas dimensionadas pelo conteúdo
 *   - whitespace-normal + break-words → sem texto cortado
 *   - overflow-x-auto no container → scroll horizontal em telas pequenas
 *   - min-w-[120px] nas colunas de dados → nunca colapsam
 */
import React from "react";
import { CLS } from "@/styles/tokens";
import {
  EQUIPES, INDICADORES, INDICADOR_LABEL_CURTO, IndicadorKey, Registro,
  contabiliza,
} from "../forms/domain";

// ─── Shared table wrapper ─────────────────────────────────────────────────────
const TableWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-x-auto -mx-1 px-1 rounded-xl">
    <table className="table-auto w-full text-sm border-collapse min-w-[600px]">
      {children}
    </table>
  </div>
);

// Cabeçalho de linha de tabela (thead > tr)
const Thead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead>
    <tr className="bg-[#1A4F7A] text-white">{children}</tr>
  </thead>
);

const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <th className={`p-3 text-left text-xs font-bold whitespace-normal break-words leading-snug min-w-[100px] ${className}`}>
    {children}
  </th>
);

const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <td className={`p-3 align-top whitespace-normal break-words leading-relaxed border-b border-[#D6E2EE] ${className}`}>
    {children}
  </td>
);

// ─── Meus Registros ──────────────────────────────────────────────────────────
interface MeusRegistrosProps {
  registros: Registro[];
  filtroEquipe: string;
  setFiltroEquipe: (v: string) => void;
  onEditar: (id: string) => void;
}

export const TabMeusRegistros: React.FC<MeusRegistrosProps> = ({
  registros, filtroEquipe, setFiltroEquipe, onEditar,
}) => {
  const ajuste    = registros.filter((r) => r.equipe === filtroEquipe && r.validado === "Ajuste solicitado");
  const pendente  = registros.filter((r) => r.equipe === filtroEquipe && (!r.validado || r.validado === "Pendente"));
  const analisado = registros.filter((r) => r.equipe === filtroEquipe && ["Sim", "Não"].includes(r.validado));

  return (
    <div className={`${CLS.card} p-5 space-y-4`}>
      <div className="flex flex-col md:flex-row justify-between items-end gap-3 border-b border-[#D6E2EE] pb-3">
        <div>
          <h2 className="text-lg font-bold text-[#1C2B3A]">Meus Registros</h2>
          <p className="text-xs text-[#5A7184] mt-0.5">Consulte envios e corrija apenas os registros devolvidos.</p>
        </div>
        <div className="min-w-[240px]">
          <label className={CLS.label}>Equipe</label>
          <select value={filtroEquipe} onChange={(e) => setFiltroEquipe(e.target.value)} className={CLS.input}>
            <option value="">Selecione sua equipe</option>
            {EQUIPES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {!filtroEquipe ? (
        <p className="text-center py-8 text-[#5A7184]">Selecione sua equipe para consultar os registros.</p>
      ) : (
        <div className="space-y-5">
          <section>
            <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
              Precisa de ajuste <span className={CLS.badgePending}>{ajuste.length}</span>
            </h3>
            {ajuste.map((r) => (
              <div key={r.id} className={`${CLS.cardInner} p-3 flex justify-between items-start gap-3 mb-2`}>
                <div className="min-w-0">
                  <b className="block break-words">{r.nome}</b>
                  <div className="flex gap-2 flex-wrap items-center text-xs text-[#5A7184] mt-1">
                    <span className={CLS.badgePending}>{r.validado}</span>
                    <span className="break-words">{r.indicador}</span>
                  </div>
                  {r.nota_validacao && (
                    <div className="mt-2 p-2 bg-[#FFF8E7] text-[#795D13] text-xs rounded-lg break-words">
                      <b>Ajuste:</b> {r.nota_validacao}
                    </div>
                  )}
                  {r.evidencia && (
                    <a href={r.evidencia} target="_blank" rel="noreferrer" className="text-xs text-[#1A4F7A] font-bold mt-2 inline-block break-all">
                      ↗ Evidência
                    </a>
                  )}
                </div>
                <button onClick={() => onEditar(r.id)} className={`${CLS.btnGhost} text-xs shrink-0`}>
                  Editar e reenviar
                </button>
              </div>
            ))}
            {!ajuste.length && <p className="text-xs text-[#5A7184]">Nenhum registro requer ajuste.</p>}
          </section>

          <details open>
            <summary className="cursor-pointer font-bold border-b border-[#D6E2EE] pb-1 text-sm select-none">
              Aguardando validação ({pendente.length})
            </summary>
            <div className="mt-2 space-y-2">
              {pendente.map((r) => (
                <div key={r.id} className={`${CLS.cardInner} p-3`}>
                  <b className="block text-sm break-words">{r.nome}</b>
                  <div className="flex gap-2 flex-wrap items-center text-xs text-[#5A7184] mt-1">
                    <span className={CLS.badgePending}>Pendente</span>
                    <span className="break-words">{r.indicador}</span>
                  </div>
                </div>
              ))}
              {!pendente.length && <p className="text-xs text-[#5A7184]">Nenhum pendente.</p>}
            </div>
          </details>

          <details>
            <summary className="cursor-pointer font-bold border-b border-[#D6E2EE] pb-1 text-sm select-none">
              Já analisados ({analisado.length})
            </summary>
            <div className="mt-2 space-y-2">
              {analisado.map((r) => (
                <div key={r.id} className={`${CLS.cardInner} p-3`}>
                  <b className="block text-sm break-words">{r.nome}</b>
                  <div className="flex gap-2 flex-wrap items-center text-xs text-[#5A7184] mt-1">
                    <span className={r.validado === "Sim" ? CLS.badgeSuccess : CLS.badgeError}>
                      {r.validado === "Sim" ? "Aprovado" : "Não contabilizado"}
                    </span>
                    <span className="break-words">{r.indicador}</span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

// ─── Validação ───────────────────────────────────────────────────────────────
interface ValidacaoProps {
  pendentesList: Registro[];
  historicoList: Registro[];
  openAjusteId: string | null;
  setOpenAjusteId: (id: string | null) => void;
  ajusteTex: Record<string, string>;
  setAjusteTex: (v: Record<string, string>) => void;
  ajusteError: string | null;
  setAjusteError: (v: string | null) => void;
  onValidar: (id: string, status: Registro["validado"], nota?: string) => void;
}

export const TabValidacao: React.FC<ValidacaoProps> = ({
  pendentesList, historicoList, openAjusteId, setOpenAjusteId,
  ajusteTex, setAjusteTex, ajusteError, setAjusteError, onValidar,
}) => (
  <div className="space-y-4">
    <div className="flex justify-between items-end gap-4 border-b border-[#D6E2EE] pb-3">
      <div>
        <h2 className="text-lg font-bold text-[#1C2B3A]">Validação da coordenação</h2>
        <p className="text-xs text-[#5A7184] mt-0.5">Revise a evidência e decida se o registro entra nos indicadores.</p>
      </div>
      <div className="text-center border border-[#D6E2EE] bg-white rounded-xl px-4 py-2 shrink-0">
        <b className="block text-2xl text-[#1A4F7A]">{pendentesList.length}</b>
        <span className="text-xs text-[#5A7184]">pendentes</span>
      </div>
    </div>

    <div className={`${CLS.card} p-5 space-y-3`}>
      <h3 className="text-sm font-bold text-[#1C2B3A]">Aguardando decisão</h3>
      {!pendentesList.length ? (
        <p className="text-center py-6 text-[#5A7184]">Nenhum registro aguardando validação.</p>
      ) : pendentesList.map((r) => (
        <article key={r.id} className={`${CLS.cardInner} p-4 space-y-2`}>
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <b className="block break-words">{r.nome}</b>
              <div className="flex gap-2 flex-wrap items-center text-xs mt-1">
                <span className={CLS.badgeInfo}>{r.equipe}</span>
                <span className="text-[#5A7184] break-words">{r.indicador}</span>
                {r.tipo && <span className="text-[#5A7184]">• {r.tipo}</span>}
              </div>
            </div>
            <span className={`${CLS.badgePending} shrink-0`}>{r.status || "—"}</span>
          </div>

          {r.evidencia
            ? <a href={r.evidencia} target="_blank" rel="noreferrer" className="text-xs text-[#1A4F7A] font-bold break-all">↗ Abrir evidência</a>
            : <span className="text-xs text-[#5A7184]">Sem evidência</span>}

          <div className="flex gap-2 flex-wrap border-t border-[#D6E2EE] pt-2">
            <button onClick={() => onValidar(r.id, "Sim")} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#E7F6EF] text-[#1B7F5A] hover:bg-[#d0efdf] transition">✓ Aprovar</button>
            <button onClick={() => setOpenAjusteId(openAjusteId === r.id ? null : r.id)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FFF4D6] text-[#8B6200] hover:bg-[#ffe8a8] transition">↶ Solicitar ajuste</button>
            <button onClick={() => onValidar(r.id, "Não")} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FDEAEA] text-[#A13B3B] hover:bg-[#fad3d3] transition">✕ Não contabilizar</button>
          </div>

          {openAjusteId === r.id && (
            <div className="p-3 border border-[#D6E2EE] bg-[#FFF8E7] rounded-xl space-y-2">
              <label className="block text-xs font-bold">O que precisa ser ajustado?</label>
              <textarea
                value={ajusteTex[r.id] ?? ""}
                onChange={(e) => setAjusteTex({ ...ajusteTex, [r.id]: e.target.value })}
                placeholder="Ex.: inserir o link da evidência ou corrigir o tipo de produto."
                className={`${CLS.input} min-h-[80px]`}
              />
              {ajusteError && <p className="text-xs text-[#A13B3B] font-bold">{ajusteError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!ajusteTex[r.id]?.trim()) { setAjusteError("Escreva uma orientação para a equipe."); return; }
                    onValidar(r.id, "Ajuste solicitado", ajusteTex[r.id]);
                  }}
                  className="px-3 py-1.5 text-xs bg-[#FFF4D6] text-[#8B6200] font-bold rounded-lg"
                >Enviar</button>
                <button onClick={() => setOpenAjusteId(null)} className={`${CLS.btnSecondary} text-xs`}>Cancelar</button>
              </div>
            </div>
          )}
        </article>
      ))}
    </div>

    <div className={`${CLS.card} p-5`}>
      <details>
        <summary className="cursor-pointer font-bold text-sm select-none">
          Histórico de validação <span className="text-xs text-[#5A7184]">({historicoList.length})</span>
        </summary>
        <div className="mt-3 space-y-2">
          {!historicoList.length ? (
            <p className="text-sm text-[#5A7184] text-center py-4">Ainda não há histórico.</p>
          ) : historicoList.map((r) => (
            <div key={r.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 border-b border-[#D6E2EE] pb-2 text-sm">
              <div className="min-w-0">
                <b className="break-words">{r.nome}</b>
                <div className="text-xs text-[#5A7184] break-words">{r.equipe} · {r.indicador}</div>
                {r.nota_validacao && <div className="text-xs p-1.5 bg-[#FFF8E7] text-[#795D13] rounded mt-1 break-words">{r.nota_validacao}</div>}
              </div>
              <div>
                <span className={r.validado === "Sim" ? CLS.badgeSuccess : r.validado === "Não" ? CLS.badgeError : CLS.badgePending}>
                  {r.validado}
                </span>
              </div>
              <div>
                <button onClick={() => onValidar(r.id, "Pendente")} className={`${CLS.btnSecondary} text-xs`}>Reabrir</button>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  </div>
);

// ─── Tabela 2: Resultados por Equipe (detalhada) ──────────────────────────────
const fmtBrl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (v: number) => v.toLocaleString("pt-BR");

const COLS: { key: IndicadorKey; label: string; fmt: (v: number) => string }[] = [
  { key: "politicas",   label: "Doc. Políticas Públicas",  fmt: fmtNum },
  { key: "publicacoes", label: "Publicações Científicas",  fmt: fmtNum },
  { key: "cursos",      label: "Cursos / Eventos / Ações", fmt: fmtNum },
  { key: "tecnologia",  label: "Projetos Tecnológicos",    fmt: fmtNum },
  { key: "divulgacao",  label: "Alcance Divulgação",       fmt: fmtNum },
  { key: "recursos",    label: "Captação de Recursos",     fmt: fmtBrl },
];

interface ResultadosEquipeProps {
  resumo: Record<string, Record<IndicadorKey, number>>;
  totais: Record<IndicadorKey, number>;
  onOpenModal: (key: IndicadorKey, equipe: string) => void;
}

export const TabResultadosEquipe: React.FC<ResultadosEquipeProps> = ({ resumo, totais, onOpenModal }) => (
  <div className="space-y-4">
    {/* KPI cards */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {COLS.map(({ key, label, fmt }) => (
        <div key={key} className={`${CLS.card} p-4`}>
          <p className="text-xs text-[#5A7184] leading-snug mb-1">{label}</p>
          <button
            onClick={() => onOpenModal(key, "")}
            disabled={!totais[key]}
            className="text-xl font-extrabold text-[#1A4F7A] underline disabled:no-underline disabled:text-[#5A7184] break-words text-left"
          >
            {fmt(totais[key])}
          </button>
        </div>
      ))}
    </div>

    {/* Tabela 2 */}
    <div className={`${CLS.card} p-5`}>
      <h2 className="text-base font-bold text-[#1C2B3A] mb-4">
        Tabela 2 — Síntese de Indicadores e principais resultados do CIATEN com detalhamento por núcleo, {new Date().getFullYear()}
      </h2>
      <TableWrap>
        <Thead>
          <Th className="min-w-[160px]">Equipe / Núcleo</Th>
          {COLS.map((c) => <Th key={c.key} className="min-w-[120px]">{c.label}</Th>)}
        </Thead>
        <tbody>
          {EQUIPES.map((eq, i) => (
            <tr key={eq} className={i % 2 === 0 ? "bg-white" : "bg-[#F5F7FA]"}>
              <Td className="font-semibold text-[#1C2B3A] min-w-[160px]">{eq}</Td>
              {COLS.map(({ key, fmt }) => (
                <Td key={key} className="min-w-[120px]">
                  <button
                    onClick={() => onOpenModal(key, eq)}
                    disabled={!resumo[eq]?.[key]}
                    className="font-extrabold text-[#1A4F7A] underline disabled:no-underline disabled:text-[#5A7184] text-sm break-words text-left"
                  >
                    {key === "recursos" ? fmtBrl(resumo[eq]?.[key] ?? 0) : fmtNum(resumo[eq]?.[key] ?? 0)}
                  </button>
                </Td>
              ))}
            </tr>
          ))}
          <tr className="bg-[#1A4F7A] text-white font-bold">
            <td className="p-3 text-sm rounded-bl-lg">Total</td>
            {COLS.map(({ key, fmt }) => (
              <td key={key} className="p-3 text-sm">{fmt(totais[key])}</td>
            ))}
          </tr>
        </tbody>
      </TableWrap>
    </div>
  </div>
);

// ─── Tabela 1: Síntese consolidada CIATEN ────────────────────────────────────
/**
 * Regras de cálculo (extraídas de domain.contabiliza):
 *   politicas   → status "Concluído" e validado "Sim"            → contagem
 *   publicacoes → status "Aceito" | "Publicado" e validado "Sim" → contagem
 *   cursos      → status "Concluído" e validado "Sim"            → contagem
 *   tecnologia  → status "Piloto" | "Implementado" e validado "Sim" → contagem
 *   divulgacao  → qualquer validado "Sim" com evidência          → soma de alcance
 *   recursos    → status "Aprovado" | "Recurso recebido" e validado "Sim" → soma de valor (BRL + USD separado)
 */
const TABELA1_LINHAS: {
  key: IndicadorKey;
  indicador: string;
  mede: string;
  calculo: string;
  formatResult: (totais: Record<IndicadorKey, number>, usd: number) => string;
}[] = [
  {
    key: "politicas",
    indicador: "Documentos de recomendação para políticas públicas",
    mede: "Capacidade do CIATEN de produzir evidências aplicáveis à tomada de decisão e apoiar gestores com proposições claras.",
    calculo: "Contagem total dos documentos com recomendações (mapas de evidências, relatórios técnicos, sínteses) que foram concluídos e validados.",
    formatResult: (t) => `${t.politicas} documento${t.politicas !== 1 ? "s" : ""}`,
  },
  {
    key: "publicacoes",
    indicador: "Publicações científicas",
    mede: "Produção de conhecimento técnico-científico vinculada aos núcleos e plataformas do CIATEN.",
    calculo: "Soma de artigos, capítulos, livros, relatórios técnicos com ISSN/ISBN, pré-prints ou aceitações formais.",
    formatResult: (t) => `${t.publicacoes} publicaç${t.publicacoes !== 1 ? "ões" : "ão"}`,
  },
  {
    key: "cursos",
    indicador: "Cursos, eventos e ações de formação",
    mede: "Atividades formativas que qualificam profissionais e difundem conhecimento.",
    calculo: "Número total de cursos, oficinas, workshops, webinários e eventos realizados e validados.",
    formatResult: (t) => `${t.cursos} ação${t.cursos !== 1 ? "ões" : ""} formativa${t.cursos !== 1 ? "s" : ""}`,
  },
  {
    key: "tecnologia",
    indicador: "Projetos de inovação e desenvolvimento tecnológico",
    mede: "Iniciativas que envolvem criação, prototipagem ou aprimoramento de tecnologias e soluções inovadoras.",
    calculo: "Contagem de projetos registrados (softwares, dashboards, dispositivos, biotecnologias) em fase de piloto ou implementados.",
    formatResult: (t) => `${t.tecnologia} projeto${t.tecnologia !== 1 ? "s" : ""} tecnológico${t.tecnologia !== 1 ? "s" : ""}`,
  },
  {
    key: "divulgacao",
    indicador: "Alcance e engajamento nas redes sociais",
    mede: "Impacto e visibilidade do CIATEN na comunicação institucional.",
    calculo: "Soma de visualizações, acessos e interações em todas as redes sociais informadas nos registros validados.",
    formatResult: (t) => t.divulgacao > 0
      ? t.divulgacao.toLocaleString("pt-BR") + " interações"
      : "a ser calculado",
  },
  {
    key: "recursos",
    indicador: "Captação de recursos institucionais",
    mede: "Capacidade de mobilização financeira para pesquisa, inovação, eventos e parcerias.",
    calculo: "Soma de recursos captados via editais, convênios, cooperações e apoios institucionais aprovados.",
    formatResult: (t, usd) => {
      const brl = t.recursos > 0 ? t.recursos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
      const usdStr = usd > 0 ? `US$ ${usd.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "";
      if (!brl && !usdStr) return "R$ 0,00";
      return [brl, usdStr].filter(Boolean).join(" + ");
    },
  },
];

interface SinteseCiatenProps {
  totais: Record<IndicadorKey, number>;
  usdTotal: number;
  onExportCsv: () => void;
  onExportSheets: () => void;
  sheetsStatus: "idle" | "loading" | "success" | "error";
  sheetsError: string | null;
  onClearData: () => void;
}

export const TabResultadosCiaten: React.FC<SinteseCiatenProps> = ({
  totais, usdTotal, onExportCsv, onExportSheets, sheetsStatus, sheetsError, onClearData,
}) => {
  const ano = new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* ── Tabela 1 ── */}
      <div className={`${CLS.card} p-5`}>
        <h2 className="text-base font-bold text-[#1C2B3A] mb-1">
          Tabela 1 — Síntese de indicadores e principais resultados do CIATEN, {ano}
        </h2>
        <p className="text-xs text-[#5A7184] mb-4">
          Fonte: Indicadores Estratégicos para Monitoramento e Avaliação das Ações do CIATEN.
          Valores calculados dinamicamente a partir dos registros validados.
        </p>
        <TableWrap>
          <Thead>
            <Th className="min-w-[180px]">Indicador</Th>
            <Th className="min-w-[200px]">O que mede</Th>
            <Th className="min-w-[200px]">Como é calculado</Th>
            <Th className="min-w-[140px]">{ano}</Th>
          </Thead>
          <tbody>
            {TABELA1_LINHAS.map(({ key, indicador, mede, calculo, formatResult }, i) => (
              <tr key={key} className={i % 2 === 0 ? "bg-white" : "bg-[#F5F7FA]"}>
                <Td className="font-bold text-[#1C2B3A]">{indicador}</Td>
                <Td className="text-[#5A7184]">{mede}</Td>
                <Td className="text-[#5A7184]">{calculo}</Td>
                <Td className="font-bold text-[#1A4F7A]">{formatResult(totais, usdTotal)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </div>

      {/* ── Feedback de exportação Sheets ── */}
      {sheetsStatus === "success" && (
        <div className="border border-[#a3d9b8] bg-[#E7F6EF] text-[#1B7F5A] rounded-xl p-3 font-semibold text-sm">
          ✓ Tabela 1 exportada com sucesso para o Google Sheets (aba "{process.env.NEXT_PUBLIC_TAB_TABELA1 ?? "Tabela1"}").
        </div>
      )}
      {sheetsStatus === "error" && (
        <div className="border border-[#f5c6c6] bg-[#FDEAEA] text-[#A13B3B] rounded-xl p-3 text-sm">
          <b>Erro ao exportar para o Sheets:</b> {sheetsError}
        </div>
      )}

      {/* ── Ações ── */}
      <div className={`${CLS.card} p-4 flex flex-wrap gap-3 items-center`}>
        {/* Exportar CSV */}
        <button onClick={onExportCsv} className={CLS.btnGhost}>
          ⬇ Baixar CSV
        </button>

        {/* Exportar para Google Sheets */}
        <button
          onClick={onExportSheets}
          disabled={sheetsStatus === "loading"}
          className={`${CLS.btnPrimary} flex items-center gap-2`}
        >
          {sheetsStatus === "loading" && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
          )}
          {sheetsStatus === "loading" ? "Exportando…" : "↗ Exportar para Google Sheets"}
        </button>

        <div className="flex-1" />

        <button
          onClick={() => { if (confirm("Apagar todos os registros locais?")) onClearData(); }}
          className="px-4 py-2.5 bg-white border border-[#D6E2EE] text-[#A13B3B] font-bold rounded-xl hover:bg-[#FDEAEA] transition text-sm"
        >
          Limpar dados locais
        </button>
      </div>
    </div>
  );
};

// ─── Modal de detalhamento ────────────────────────────────────────────────────
interface ModalProps {
  modalData: { key: IndicadorKey; equipe: string } | null;
  registrosModal: Registro[];
  onClose: () => void;
}

export const ModalDetalhes: React.FC<ModalProps> = ({ modalData, registrosModal, onClose }) => {
  if (!modalData) return null;
  return (
    <div className="fixed inset-0 bg-[#0F2332]/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-[#D6E2EE] rounded-2xl max-w-2xl w-full max-h-[82vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#1C2B3A] break-words">{INDICADORES[modalData.key]}</h2>
            <p className="text-xs text-[#5A7184] mt-0.5">
              {modalData.equipe ? `${modalData.equipe} • ` : `CIATEN ${new Date().getFullYear()} • `}
              {registrosModal.length} registro(s) contabilizado(s)
            </p>
          </div>
          <button onClick={onClose} className={`${CLS.btnSecondary} text-sm shrink-0`}>Fechar</button>
        </div>
        <div className="space-y-2">
          {!registrosModal.length ? (
            <p className="text-center py-6 text-[#5A7184]">Nenhum registro contabilizado.</p>
          ) : registrosModal.map((r) => (
            <div key={r.id} className={`${CLS.cardInner} p-3 space-y-1`}>
              <b className="block text-sm break-words">{r.nome}</b>
              <div className="text-xs text-[#5A7184] flex flex-wrap gap-2">
                <span>{r.equipe}</span>
                {r.tipo && <span>• {r.tipo}</span>}
                <span>• {r.status || "Publicado"}</span>
                {r.valor_aprovado && (
                  <span>• {Number(r.valor_aprovado).toLocaleString("pt-BR", { style: "currency", currency: r.moeda || "BRL" })}</span>
                )}
                {r.alcance && <span>• Alcance: {Number(r.alcance).toLocaleString("pt-BR")}</span>}
              </div>
              {r.financiador && <p className="text-xs text-[#5A7184]">Financiador: {r.financiador}</p>}
              {r.evidencia && (
                <a href={r.evidencia} target="_blank" rel="noreferrer" className="text-xs text-[#1A4F7A] font-bold break-all">
                  Abrir evidência ↗
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};