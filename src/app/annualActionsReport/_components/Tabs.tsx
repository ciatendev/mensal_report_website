/**
 * Tabs.tsx — Abas da página annualActionsReport.
 * Usa DbRegistro (dados do banco), ActivityStatus e contabiliza() atualizados.
 */
import React from "react";
import { CLS } from "@/styles/tokens";
import {
  EQUIPES, INDICADORES, INDICADOR_LABEL_CURTO, IndicadorKey,
  DbRegistro, ActivityStatus, STATUS_LABEL, contabiliza,
} from "../forms/domain";

// ─── Shared table primitives ─────────────────────────────────────────────────
const TableWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-x-auto rounded-xl">
    <table className="table-auto w-full text-sm border-collapse">{children}</table>
  </div>
);
const Thead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead><tr className="bg-[#1A4F7A] text-white">{children}</tr></thead>
);
const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <th className={`p-3 text-left text-xs font-bold whitespace-nowrap leading-snug ${className}`}>{children}</th>
);
const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <td className={`p-3 align-top whitespace-nowrap leading-relaxed border-b border-[#D6E2EE] ${className}`}>{children}</td>
);
// Td para conteúdo que pode quebrar (colunas de dados, não rótulos)
const TdWrap: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <td className={`p-3 align-top whitespace-normal break-words leading-relaxed border-b border-[#D6E2EE] ${className}`}>{children}</td>
);

// Badge de status do ciclo de vida
const StatusBadge: React.FC<{ status: ActivityStatus }> = ({ status }) => {
  const cls: Record<ActivityStatus, string> = {
    PENDING:           CLS.badgePending,
    APPROVED:          CLS.badgeSuccess,
    REJECTED:          CLS.badgeError,
    ADJUSTMENT_NEEDED: "bg-[#FEF0E9] text-[#E85D1F] px-2 py-0.5 rounded-full text-xs font-bold",
  };
  return <span className={cls[status]}>{STATUS_LABEL[status]}</span>;
};

// ─── Meus Registros ──────────────────────────────────────────────────────────
interface MeusRegistrosProps {
  registros: DbRegistro[];
  loadingData: boolean;
  filtroEquipe: string;
  setFiltroEquipe: (v: string) => void;
  onEditar: (id: string) => void;
}

export const TabMeusRegistros: React.FC<MeusRegistrosProps> = ({
  registros, loadingData, filtroEquipe, setFiltroEquipe, onEditar,
}) => {
  const ajuste    = registros.filter((r) => r.activityStatus === "ADJUSTMENT_NEEDED");
  const pendente  = registros.filter((r) => r.activityStatus === "PENDING");
  const analisado = registros.filter((r) => ["APPROVED","REJECTED"].includes(r.activityStatus));

  const Section: React.FC<{ title: React.ReactNode; items: DbRegistro[]; emptyMsg: string }> = ({ title, items, emptyMsg }) => (
    <section>
      <h3 className="text-sm font-bold flex items-center gap-2 mb-2">{title}</h3>
      {!items.length
        ? <p className="text-xs text-[#5A7184]">{emptyMsg}</p>
        : items.map((r) => (
          <div key={r.id} className={`${CLS.cardInner} p-3 flex justify-between items-start gap-3 mb-2`}>
            <div className="min-w-0">
              <b className="block break-words">{r.nome}</b>
              <div className="flex gap-2 flex-wrap items-center text-xs text-[#5A7184] mt-1">
                <StatusBadge status={r.activityStatus} />
                <span className="break-words">{r.indicador}</span>
              </div>
              {r.notaValidacao && (
                <div className="mt-2 p-2 bg-[#FFF8E7] text-[#795D13] text-xs rounded-lg break-words">
                  <b>Nota:</b> {r.notaValidacao}
                </div>
              )}
              {r.evidencia && (
                <a href={r.evidencia} target="_blank" rel="noreferrer" className="text-xs text-[#1A4F7A] font-bold mt-2 inline-block break-all">↗ Evidência</a>
              )}
              {r.syncedToSheets && (
                <span className="text-xs text-[#1B7F5A] mt-1 inline-block">✓ Sincronizado no Sheets</span>
              )}
            </div>
            {["PENDING","ADJUSTMENT_NEEDED"].includes(r.activityStatus) && (
              <button onClick={() => onEditar(r.id)} className={`${CLS.btnGhost} text-xs shrink-0`}>
                Editar e reenviar
              </button>
            )}
          </div>
        ))
      }
    </section>
  );

  return (
    <div className={`${CLS.card} p-5 space-y-4`}>
      <div className="flex flex-col md:flex-row justify-between items-end gap-3 border-b border-[#D6E2EE] pb-3">
        <div>
          <h2 className="text-lg font-bold text-[#1C2B3A]">Meus Registros</h2>
          <p className="text-xs text-[#5A7184] mt-0.5">
            {loadingData ? "Carregando…" : `${registros.length} registro(s) encontrado(s)`}
          </p>
        </div>
        <div className="min-w-[240px]">
          <label className={CLS.label}>Filtrar por equipe</label>
          <select value={filtroEquipe} onChange={(e) => setFiltroEquipe(e.target.value)} className={CLS.input}>
            <option value="">Todas as equipes</option>
            {EQUIPES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      {loadingData ? (
        <div className="text-center py-10 text-[#5A7184]">
          <span className="inline-block w-6 h-6 border-2 border-[#1A4F7A] border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm">Carregando registros…</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Section title={<>Precisa de ajuste <span className="bg-[#FEF0E9] text-[#E85D1F] px-2 py-0.5 rounded-full text-xs font-bold">{ajuste.length}</span></>} items={ajuste} emptyMsg="Nenhum registro requer ajuste." />
          <details open>
            <summary className="cursor-pointer font-bold border-b border-[#D6E2EE] pb-1 text-sm select-none">Aguardando validação ({pendente.length})</summary>
            <div className="mt-2 space-y-2">
              {!pendente.length ? <p className="text-xs text-[#5A7184]">Nenhum pendente.</p>
                : pendente.map((r) => (
                  <div key={r.id} className={`${CLS.cardInner} p-3`}>
                    <b className="block text-sm break-words">{r.nome}</b>
                    <div className="flex gap-2 flex-wrap items-center text-xs text-[#5A7184] mt-1">
                      <StatusBadge status={r.activityStatus} />
                      <span className="break-words">{r.indicador}</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </details>
          <details>
            <summary className="cursor-pointer font-bold border-b border-[#D6E2EE] pb-1 text-sm select-none">Já analisados ({analisado.length})</summary>
            <div className="mt-2 space-y-2">
              {analisado.map((r) => (
                <div key={r.id} className={`${CLS.cardInner} p-3`}>
                  <b className="block text-sm break-words">{r.nome}</b>
                  <div className="flex gap-2 flex-wrap items-center text-xs text-[#5A7184] mt-1">
                    <StatusBadge status={r.activityStatus} />
                    <span className="break-words">{r.indicador}</span>
                  </div>
                  {r.syncedToSheets && <span className="text-xs text-[#1B7F5A] mt-1 inline-block">✓ Sheets</span>}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

// ─── Validação (SUPER_USER) ───────────────────────────────────────────────────
interface ValidacaoProps {
  pendentesList: DbRegistro[];
  historicoList: DbRegistro[];
  loadingData: boolean;
  openAjusteId: string | null;
  setOpenAjusteId: (id: string | null) => void;
  ajusteTex: Record<string, string>;
  setAjusteTex: (v: Record<string, string>) => void;
  ajusteError: string | null;
  setAjusteError: (v: string | null) => void;
  onValidar: (id: string, status: "APPROVED" | "REJECTED" | "ADJUSTMENT_NEEDED", nota?: string) => void;
}

export const TabValidacao: React.FC<ValidacaoProps> = ({
  pendentesList, historicoList, loadingData,
  openAjusteId, setOpenAjusteId, ajusteTex, setAjusteTex, ajusteError, setAjusteError, onValidar,
}) => (
  <div className="space-y-4">
    <div className="flex justify-between items-end gap-4 border-b border-[#D6E2EE] pb-3">
      <div>
        <h2 className="text-lg font-bold text-[#1C2B3A]">Validação da coordenação</h2>
        <p className="text-xs text-[#5A7184] mt-0.5">Revise a evidência. Somente ao aprovar, o registro é sincronizado com o Google Sheets.</p>
      </div>
      <div className="text-center border border-[#D6E2EE] bg-white rounded-xl px-4 py-2 shrink-0">
        <b className="block text-2xl text-[#1A4F7A]">{pendentesList.length}</b>
        <span className="text-xs text-[#5A7184]">pendentes</span>
      </div>
    </div>

    <div className={`${CLS.card} p-5 space-y-3`}>
      <h3 className="text-sm font-bold text-[#1C2B3A]">Aguardando decisão</h3>
      {loadingData ? (
        <p className="text-center py-6 text-[#5A7184] text-sm">Carregando…</p>
      ) : !pendentesList.length ? (
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
              <div className="text-xs text-[#5A7184] mt-0.5">
                Por: <b>{r.author.name ?? r.author.email}</b> · {new Date(r.createdAt).toLocaleDateString("pt-BR")}
              </div>
            </div>
            <span className="text-xs text-[#5A7184] shrink-0 break-words max-w-[120px] text-right">{r.statusAtividade || "—"}</span>
          </div>

          {r.evidencia
            ? <a href={r.evidencia} target="_blank" rel="noreferrer" className="text-xs text-[#1A4F7A] font-bold break-all">↗ Abrir evidência</a>
            : <span className="text-xs text-[#5A7184]">Sem evidência</span>}

          <div className="flex gap-2 flex-wrap border-t border-[#D6E2EE] pt-2">
            <button onClick={() => onValidar(r.id, "APPROVED")} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#E7F6EF] text-[#1B7F5A] hover:bg-[#d0efdf] transition">
              ✓ Aprovar e sincronizar Sheets
            </button>
            <button onClick={() => setOpenAjusteId(openAjusteId === r.id ? null : r.id)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FEF0E9] text-[#E85D1F] hover:bg-[#fcd8c4] transition">
              ↶ Solicitar ajuste
            </button>
            <button onClick={() => onValidar(r.id, "REJECTED")} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FDEAEA] text-[#A13B3B] hover:bg-[#fad3d3] transition">
              ✕ Rejeitar
            </button>
          </div>

          {openAjusteId === r.id && (
            <div className="p-3 border border-[#D6E2EE] bg-[#FFF8E7] rounded-xl space-y-2">
              <label className="block text-xs font-bold">O que precisa ser ajustado?</label>
              <textarea
                value={ajusteTex[r.id] ?? ""}
                onChange={(e) => setAjusteTex({ ...ajusteTex, [r.id]: e.target.value })}
                placeholder="Ex.: inserir o link da evidência ou corrigir o tipo."
                className={`${CLS.input} min-h-[80px]`}
              />
              {ajusteError && <p className="text-xs text-[#A13B3B] font-bold">{ajusteError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!ajusteTex[r.id]?.trim()) { setAjusteError("Escreva uma orientação."); return; }
                    onValidar(r.id, "ADJUSTMENT_NEEDED", ajusteTex[r.id]);
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

    {/* Histórico */}
    <div className={`${CLS.card} p-5`}>
      <details>
        <summary className="cursor-pointer font-bold text-sm select-none">
          Histórico de validação <span className="text-xs text-[#5A7184]">({historicoList.length})</span>
        </summary>
        <div className="mt-3 space-y-2">
          {!historicoList.length ? (
            <p className="text-sm text-[#5A7184] text-center py-4">Ainda não há histórico.</p>
          ) : historicoList.map((r) => (
            <div key={r.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-[#D6E2EE] pb-2 text-sm items-start">
              <div className="md:col-span-2 min-w-0">
                <b className="break-words">{r.nome}</b>
                <div className="text-xs text-[#5A7184] break-words">{r.equipe} · {r.indicador}</div>
                {r.notaValidacao && <div className="text-xs p-1.5 bg-[#FFF8E7] text-[#795D13] rounded mt-1 break-words">{r.notaValidacao}</div>}
              </div>
              <div className="flex flex-col gap-1">
                <StatusBadge status={r.activityStatus} />
                {r.syncedToSheets && <span className="text-xs text-[#1B7F5A]">✓ Sheets</span>}
              </div>
              <div className="text-xs text-[#5A7184]">
                {r.validatedBy && <span>{r.validatedBy.name}</span>}
                {r.validatedAt && <span className="block">{new Date(r.validatedAt).toLocaleDateString("pt-BR")}</span>}
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  </div>
);

// ─── Tabela 2: Resultados por Equipe ─────────────────────────────────────────
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
  onExportCsv: () => void;
  onExportSheets: () => void;
  sheetsStatus: "idle" | "loading" | "success" | "error";
  sheetsError: string | null;
  isSuperUser: boolean;
}

export const TabResultadosEquipe: React.FC<ResultadosEquipeProps> = ({
  resumo, totais, onOpenModal, onExportCsv,
  onExportSheets, sheetsStatus, sheetsError, isSuperUser,
}) => (
  <div className="space-y-4">
    {/* KPI cards */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {COLS.map(({ key, label, fmt }) => (
        <div key={key} className={`${CLS.card} p-4`}>
          <p className="text-xs text-[#5A7184] leading-snug mb-1">{label}</p>
          <button onClick={() => onOpenModal(key, "")} disabled={!totais[key]}
            className="text-xl font-extrabold text-[#1A4F7A] underline disabled:no-underline disabled:text-[#5A7184] break-words text-left">
            {fmt(totais[key])}
          </button>
        </div>
      ))}
    </div>

    {/* Tabela 2 */}
    <div className={`${CLS.card} p-5`}>
      <div className="mb-4">
        <h2 className="text-base font-bold text-[#1C2B3A]">
          Tabela 2 — Síntese de Indicadores por Núcleo, {new Date().getFullYear()}
        </h2>
        <p className="text-xs text-[#5A7184] mt-0.5">* Apenas registros <b>Aprovados</b> são contabilizados.</p>
      </div>
      <TableWrap>
        <Thead>
          <Th className="min-w-[200px]">Equipe / Núcleo</Th>
          {COLS.map((c) => <Th key={c.key} className="min-w-[180px]">{c.label}</Th>)}
        </Thead>
        <tbody>
          {EQUIPES.map((eq, i) => (
            <tr key={eq} className={i % 2 === 0 ? "bg-white" : "bg-[#F5F7FA]"}>
              <Td className="font-semibold text-[#1C2B3A] min-w-[200px]">{eq}</Td>
              {COLS.map(({ key, fmt }) => (
                <TdWrap key={key} className="min-w-[180px]">
                  <button onClick={() => onOpenModal(key, eq)} disabled={!resumo[eq]?.[key]}
                    className="font-extrabold text-[#1A4F7A] underline disabled:no-underline disabled:text-[#5A7184] text-sm break-words text-left">
                    {key === "recursos" ? fmtBrl(resumo[eq]?.[key] ?? 0) : fmtNum(resumo[eq]?.[key] ?? 0)}
                  </button>
                </TdWrap>
              ))}
            </tr>
          ))}
          <tr className="bg-[#1A4F7A] text-white font-bold">
            <td className="p-3 rounded-bl-lg text-sm">Total</td>
            {COLS.map(({ key, fmt }) => <td key={key} className="p-3 text-sm">{fmt(totais[key])}</td>)}
          </tr>
        </tbody>
      </TableWrap>
    </div>

    {/* Feedback Sheets */}
    {sheetsStatus === "success" && (
      <div className="border border-[#a3d9b8] bg-[#E7F6EF] text-[#1B7F5A] rounded-xl p-3 text-sm font-semibold">
        ✓ Aba "Tabela 2" recriada com sucesso no Google Sheets.
      </div>
    )}
    {sheetsStatus === "error" && (
      <div className="border border-[#f5c6c6] bg-[#FDEAEA] text-[#A13B3B] rounded-xl p-3 text-sm">
        <b>Erro ao exportar:</b> {sheetsError}
      </div>
    )}

    {/* Ações */}
    <div className={`${CLS.card} p-4 flex flex-wrap gap-3 items-center`}>
      <button onClick={onExportCsv} className={CLS.btnGhost}>⬇ Baixar CSV</button>
      {isSuperUser && (
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
      )}
    </div>
  </div>
);

// ─── Tabela 1: Síntese CIATEN ─────────────────────────────────────────────────
const TABELA1_LINHAS: {
  key: IndicadorKey; indicador: string; mede: string; calculo: string;
  formatResult: (totais: Record<IndicadorKey, number>, usd: number) => string;
}[] = [
  { key: "politicas",   indicador: "Documentos de recomendação para políticas públicas",   mede: "Capacidade do CIATEN de produzir evidências aplicáveis à tomada de decisão.", calculo: "Contagem de documentos concluídos e validados.", formatResult: (t) => `${t.politicas} documento${t.politicas !== 1 ? "s" : ""}` },
  { key: "publicacoes", indicador: "Publicações científicas",                              mede: "Produção de conhecimento técnico-científico.", calculo: "Soma de artigos, capítulos, livros, pré-prints e aceitações.", formatResult: (t) => `${t.publicacoes} publicaç${t.publicacoes !== 1 ? "ões" : "ão"}` },
  { key: "cursos",      indicador: "Cursos, eventos e ações de formação",                  mede: "Atividades formativas que qualificam profissionais.", calculo: "Número total de cursos, oficinas, workshops e eventos realizados.", formatResult: (t) => `${t.cursos} ação${t.cursos !== 1 ? "ões" : ""} formativa${t.cursos !== 1 ? "s" : ""}` },
  { key: "tecnologia",  indicador: "Projetos de inovação e desenvolvimento tecnológico",   mede: "Iniciativas de criação ou aprimoramento de tecnologias.", calculo: "Projetos em fase de piloto ou implementados.", formatResult: (t) => `${t.tecnologia} projeto${t.tecnologia !== 1 ? "s" : ""} tecnológico${t.tecnologia !== 1 ? "s" : ""}` },
  { key: "divulgacao",  indicador: "Alcance e engajamento nas redes sociais",              mede: "Impacto e visibilidade do CIATEN na comunicação.", calculo: "Soma de visualizações, acessos e interações.", formatResult: (t) => t.divulgacao > 0 ? `${t.divulgacao.toLocaleString("pt-BR")} interações` : "a ser calculado" },
  { key: "recursos",    indicador: "Captação de recursos institucionais",                  mede: "Capacidade de mobilização financeira.", calculo: "Soma de recursos aprovados via editais, convênios e cooperações.", formatResult: (t, usd) => { const brl = t.recursos > 0 ? t.recursos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : ""; const u = usd > 0 ? `US$ ${usd.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""; return [brl, u].filter(Boolean).join(" + ") || "R$ 0,00"; } },
];

interface SinteseCiatenProps {
  totais: Record<IndicadorKey, number>;
  usdTotal: number;
  onExportCsv: () => void;           // CSV Tabela 1
  onExportTabela2Csv: () => void;    // CSV Tabela 2
  onExportRegistrosCsv: () => void;  // CSV Registros
  onExportSheets: (target: "tabela1" | "tabela2" | "registros") => void;
  sheetsExportStatus: Record<string, "idle" | "loading" | "success" | "error">;
  sheetsExportError: Record<string, string | null>;
  isSuperUser: boolean;
  onClearData?: () => void;
}

const SheetsBtn: React.FC<{ label: string; status: "idle"|"loading"|"success"|"error"; onClick: () => void }> = ({ label, status, onClick }) => (
  <button onClick={onClick} disabled={status === "loading"}
    className="w-full px-3 py-2 bg-[#1A4F7A] text-white font-bold rounded-xl hover:bg-[#0F3254] transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
    {status === "loading" && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />}
    {status === "loading" ? "Exportando…" : `↗ ${label}`}
  </button>
);

export const TabResultadosCiaten: React.FC<SinteseCiatenProps> = ({
  totais, usdTotal, onExportCsv, onExportTabela2Csv, onExportRegistrosCsv,
  onExportSheets, sheetsExportStatus, sheetsExportError, isSuperUser,
}) => {
  const ano = new Date().getFullYear();
  const st  = (t: string) => sheetsExportStatus[t] ?? "idle";
  const err = (t: string) => sheetsExportError[t] ?? null;

  return (
    <div className="space-y-6">
      {/* Tabela 1 */}
      <div className={`${CLS.card} p-5`}>
        <h2 className="text-base font-bold text-[#1C2B3A] mb-1">
          Tabela 1 — Síntese de indicadores e principais resultados do CIATEN, {ano}
        </h2>
        <p className="text-xs text-[#5A7184] mb-4">
          Fonte: Indicadores Estratégicos para Monitoramento e Avaliação das Ações do CIATEN.
          Calculado automaticamente a partir dos registros <b>aprovados</b>.
        </p>
        <TableWrap>
          <Thead>
            <Th className="min-w-[260px]">Indicador</Th>
            <Th className="min-w-[240px]">O que mede</Th>
            <Th className="min-w-[240px]">Como é calculado</Th>
            <Th className="min-w-[160px]">{ano}</Th>
          </Thead>
          <tbody>
            {TABELA1_LINHAS.map(({ key, indicador, mede, calculo, formatResult }, i) => (
              <tr key={key} className={i % 2 === 0 ? "bg-white" : "bg-[#F5F7FA]"}>
                <Td className="font-bold text-[#1C2B3A] min-w-[260px]">{indicador}</Td>
                <TdWrap className="text-[#5A7184] min-w-[240px]">{mede}</TdWrap>
                <TdWrap className="text-[#5A7184] min-w-[240px]">{calculo}</TdWrap>
                <Td className="font-bold text-[#1A4F7A] min-w-[160px]">{formatResult(totais, usdTotal)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </div>

      {/* Feedbacks */}
      {(["tabela1","tabela2","registros"] as const).map((t) => (
        <React.Fragment key={t}>
          {st(t) === "success" && <div className="border border-[#a3d9b8] bg-[#E7F6EF] text-[#1B7F5A] rounded-xl p-3 text-sm font-semibold">✓ Aba "{t === "tabela1" ? "Tabela 1" : t === "tabela2" ? "Tabela 2" : "Registros"}" recriada com sucesso no Google Sheets.</div>}
          {st(t) === "error"   && <div className="border border-[#f5c6c6] bg-[#FDEAEA] text-[#A13B3B] rounded-xl p-3 text-sm"><b>Erro "{t}":</b> {err(t)}</div>}
        </React.Fragment>
      ))}

      {/* Ações de exportação */}
      <div className={`${CLS.card} p-5 space-y-4`}>
        <div>
          <h3 className="text-sm font-bold text-[#1C2B3A] mb-1">Exportar dados</h3>
          <p className="text-xs text-[#5A7184]">
            CSV: download imediato com os totais calculados.
            {isSuperUser && " Google Sheets: recria a aba do zero com dados atuais do banco de dados."}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tabela 1 */}
          <div className="border border-[#D6E2EE] rounded-xl p-4 space-y-3">
            <div><p className="font-semibold text-sm text-[#1C2B3A]">Tabela 1</p><p className="text-xs text-[#5A7184]">Síntese consolidada por indicador</p></div>
            <button onClick={onExportCsv} className="w-full px-3 py-2 bg-[#E8F1F8] text-[#1A4F7A] font-bold rounded-xl hover:bg-[#d4e5f3] transition text-sm">⬇ Baixar CSV</button>
            {isSuperUser && <SheetsBtn label="Exportar para Sheets" status={st("tabela1")} onClick={() => onExportSheets("tabela1")} />}
          </div>
          {/* Tabela 2 */}
          <div className="border border-[#D6E2EE] rounded-xl p-4 space-y-3">
            <div><p className="font-semibold text-sm text-[#1C2B3A]">Tabela 2</p><p className="text-xs text-[#5A7184]">Registros aprovados por equipe × indicador</p></div>
            <button onClick={onExportTabela2Csv} className="w-full px-3 py-2 bg-[#E8F1F8] text-[#1A4F7A] font-bold rounded-xl hover:bg-[#d4e5f3] transition text-sm">⬇ Baixar CSV</button>
            {isSuperUser && <SheetsBtn label="Exportar para Sheets" status={st("tabela2")} onClick={() => onExportSheets("tabela2")} />}
          </div>
          {/* Registros */}
          <div className="border border-[#D6E2EE] rounded-xl p-4 space-y-3">
            <div><p className="font-semibold text-sm text-[#1C2B3A]">Registros</p><p className="text-xs text-[#5A7184]">Log completo de todos os registros</p></div>
            <button onClick={onExportRegistrosCsv} className="w-full px-3 py-2 bg-[#E8F1F8] text-[#1A4F7A] font-bold rounded-xl hover:bg-[#d4e5f3] transition text-sm">⬇ Baixar CSV</button>
            {isSuperUser && <SheetsBtn label="Exportar para Sheets" status={st("registros")} onClick={() => onExportSheets("registros")} />}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Modal de detalhamento ────────────────────────────────────────────────────
interface ModalProps {
  modalData: { key: IndicadorKey; equipe: string } | null;
  registrosModal: DbRegistro[];
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
              {registrosModal.length} registro(s) aprovados
            </p>
          </div>
          <button onClick={onClose} className={`${CLS.btnSecondary} text-sm shrink-0`}>Fechar</button>
        </div>
        <div className="space-y-2">
          {!registrosModal.length
            ? <p className="text-center py-6 text-[#5A7184]">Nenhum registro aprovado.</p>
            : registrosModal.map((r) => (
              <div key={r.id} className={`${CLS.cardInner} p-3 space-y-1`}>
                <b className="block text-sm break-words">{r.nome}</b>
                <div className="text-xs text-[#5A7184] flex flex-wrap gap-2">
                  <span>{r.equipe}</span>
                  {r.tipo && <span>• {r.tipo}</span>}
                  <span>• {r.statusAtividade || "Publicado"}</span>
                  {r.valorAprovado && <span>• {Number(r.valorAprovado).toLocaleString("pt-BR", { style: "currency", currency: r.moeda || "BRL" })}</span>}
                  {r.alcance && <span>• Alcance: {Number(r.alcance).toLocaleString("pt-BR")}</span>}
                </div>
                {r.financiador && <p className="text-xs text-[#5A7184]">Financiador: {r.financiador}</p>}
                {r.evidencia && <a href={r.evidencia} target="_blank" rel="noreferrer" className="text-xs text-[#1A4F7A] font-bold break-all">Abrir evidência ↗</a>}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};
