/**
 * Tabs.tsx — Abas da página annualActionsReport.
 * Usa DbRegistro (dados do banco), ActivityStatus e contabiliza() atualizados.
 */
import React from "react";
import { CLS } from "@/styles/tokens";
import {
  INDICADORES, INDICADOR_LABEL_CURTO, IndicadorKey,
  DbRegistro, ActivityStatus, STATUS_LABEL, contabiliza,
} from "../forms/domain";
import type { ChangeRequestRow } from "../_hooks/useAnnualReport";

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
  onDelete: (id: string) => void;
  onRequestChange: (recordId: string, type: "EDIT" | "DELETE", nota?: string) => void;
  isSuperUser: boolean;
  userTeamNome: string | null;
  dbEquipes?: string[];
}

// ─── Formulário inline de solicitação de alteração ───────────────────────────
function ChangeRequestButtons({
  recordId,
  onRequest,
}: {
  recordId: string;
  onRequest: (recordId: string, type: "EDIT" | "DELETE", nota?: string) => void;
}) {
  const [mode, setMode]     = React.useState<"idle" | "edit" | "delete">("idle");
  const [nota, setNota]     = React.useState("");
  const [sending, setSending] = React.useState(false);

  async function submit() {
    if (mode === "idle") return;
    setSending(true);
    try {
      await onRequest(recordId, mode === "edit" ? "EDIT" : "DELETE", nota.trim() || undefined);
      setMode("idle");
      setNota("");
    } finally {
      setSending(false);
    }
  }

  if (mode === "idle") {
    return (
      <>
        <button onClick={() => setMode("edit")} className={`${CLS.btnGhost} text-xs`}>✏ Solicitar edição</button>
        <button onClick={() => setMode("delete")}
          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FDEAEA] text-[#A13B3B] hover:bg-[#fad3d3] transition">
          🗑 Solicitar exclusão
        </button>
      </>
    );
  }

  const isDelete = mode === "delete";
  return (
    <div className="w-56 space-y-2 border border-[#D6E2EE] rounded-xl p-3 bg-white shadow-sm">
      <p className="text-xs font-bold text-[#1C2B3A]">
        {isDelete ? "Solicitar exclusão" : "Solicitar edição"}
      </p>
      <p className="text-xs text-[#5A7184]">
        {isDelete
          ? "A exclusão será analisada pelo coordenador."
          : "O coordenador receberá a solicitação para liberar a edição."}
      </p>
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Motivo (opcional)..."
        rows={2}
        className="w-full text-xs border border-[#D6E2EE] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1A4F7A]/30 resize-none"
      />
      <div className="flex gap-1.5">
        <button onClick={submit} disabled={sending}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition disabled:opacity-50 ${isDelete ? "bg-[#A13B3B] text-white hover:bg-[#7e2e2e]" : "bg-[#1A4F7A] text-white hover:bg-[#0F3254]"}`}>
          {sending ? "Enviando…" : "Confirmar"}
        </button>
        <button onClick={() => { setMode("idle"); setNota(""); }}
          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#D6E2EE] text-[#5A7184] hover:bg-[#F5F7FA] transition">
          Cancelar
        </button>
      </div>
    </div>
  );
}

export const TabMeusRegistros: React.FC<MeusRegistrosProps> = ({
  registros, loadingData, filtroEquipe, setFiltroEquipe, onEditar, onDelete, onRequestChange,
  isSuperUser, userTeamNome, dbEquipes = [],
}) => {
  const todasEquipes = dbEquipes;
  // Aplica filtro por equipe (SUPER_USER pode filtrar; usuário comum já recebe pre-filtrado)
  const filtrados = filtroEquipe
    ? registros.filter((r) => r.equipe === filtroEquipe)
    : registros;
  const ajuste    = filtrados.filter((r) => r.activityStatus === "ADJUSTMENT_NEEDED");
  const pendente  = filtrados.filter((r) => r.activityStatus === "PENDING");
  const analisado = filtrados.filter((r) => ["APPROVED","REJECTED"].includes(r.activityStatus));

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
              <div className="flex flex-col gap-1 shrink-0">
                <button onClick={() => onEditar(r.id)} className={`${CLS.btnGhost} text-xs`}>
                  Editar e reenviar
                </button>
                <button
                  onClick={() => { if (confirm("Remover este registro?")) onDelete(r.id); }}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FDEAEA] text-[#A13B3B] hover:bg-[#fad3d3] transition"
                >
                  Remover
                </button>
              </div>
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
            {loadingData ? "Carregando…" : `${filtrados.length} registro(s) encontrado(s)${filtroEquipe ? ` — equipe: ${filtroEquipe}` : ""}`}
          </p>
        </div>
        {isSuperUser && (
          <div className="min-w-[240px]">
            <label className={CLS.label}>Filtrar por equipe</label>
            <select value={filtroEquipe} onChange={(e) => setFiltroEquipe(e.target.value)} className={CLS.input}>
              <option value="">Todas as equipes</option>
              {todasEquipes.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        )}
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
                  <div key={r.id} className={`${CLS.cardInner} p-3 flex justify-between items-start gap-3`}>
                    <div className="min-w-0">
                      <b className="block text-sm break-words">{r.nome}</b>
                      <div className="flex gap-2 flex-wrap items-center text-xs text-[#5A7184] mt-1">
                        <StatusBadge status={r.activityStatus} />
                        <span className="text-[#1A4F7A] font-semibold">{r.equipe}</span>
                        <span className="break-words">· {r.indicador}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => onEditar(r.id)} className={`${CLS.btnGhost} text-xs`}>
                        Editar
                      </button>
                      <button
                        onClick={() => { if (confirm("Remover este registro?")) onDelete(r.id); }}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FDEAEA] text-[#A13B3B] hover:bg-[#fad3d3] transition"
                      >
                        Remover
                      </button>
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
                <div key={r.id} className={`${CLS.cardInner} p-3 flex justify-between items-start gap-3`}>
                  <div className="min-w-0">
                    <b className="block text-sm break-words">{r.nome}</b>
                    <div className="flex gap-2 flex-wrap items-center text-xs text-[#5A7184] mt-1">
                      <StatusBadge status={r.activityStatus} />
                      <span className="text-[#1A4F7A] font-semibold">{r.equipe}</span>
                      <span className="break-words">· {r.indicador}</span>
                    </div>
                    {r.syncedToSheets && <span className="text-xs text-[#1B7F5A] mt-1 inline-block">✓ Sheets</span>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {isSuperUser ? (
                      <>
                        <button onClick={() => onEditar(r.id)} className={`${CLS.btnGhost} text-xs`}>Editar</button>
                        <button onClick={() => { if (confirm("Remover este registro?")) onDelete(r.id); }}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FDEAEA] text-[#A13B3B] hover:bg-[#fad3d3] transition">
                          Remover
                        </button>
                      </>
                    ) : (
                      <ChangeRequestButtons recordId={r.id} onRequest={onRequestChange} />
                    )}
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
  changeRequests: ChangeRequestRow[];
  onReviewChange: (id: string, decision: "APPROVED" | "REJECTED", note?: string) => void;
}

export const TabValidacao: React.FC<ValidacaoProps> = ({
  pendentesList, historicoList, loadingData,
  openAjusteId, setOpenAjusteId, ajusteTex, setAjusteTex, ajusteError, setAjusteError, onValidar,
  changeRequests, onReviewChange,
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

    {/* Solicitações de alteração */}
    {(changeRequests ?? []).length > 0 && (
      <div className={`${CLS.card} p-5 space-y-3`}>
        <h3 className="text-sm font-bold text-[#1C2B3A] flex items-center gap-2">
          Solicitações de alteração
          <span className="bg-[#FEF0E9] text-[#E85D1F] px-2 py-0.5 rounded-full text-xs font-bold">{changeRequests.length}</span>
        </h3>
        {(changeRequests ?? []).map((cr) => (
          <div key={cr.id} className={`${CLS.cardInner} p-4 space-y-2`}>
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cr.type === "DELETE" ? "bg-[#FDEAEA] text-[#A13B3B] text-xs font-bold px-2 py-0.5 rounded-full" : "bg-[#E8F1F8] text-[#1A4F7A] text-xs font-bold px-2 py-0.5 rounded-full"}>
                    {cr.type === "DELETE" ? "🗑 Exclusão" : "✏ Edição"}
                  </span>
                  <b className="text-sm break-words">{cr.record.nome}</b>
                </div>
                <div className="text-xs text-[#5A7184] mt-1 flex flex-wrap gap-2">
                  <span>{cr.record.equipe}</span>
                  <span>· Solicitado por: <b>{cr.requestedBy.name ?? cr.requestedBy.email}</b></span>
                  <span>· {new Date(cr.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
                {cr.nota && <div className="text-xs bg-[#FFF8E7] text-[#795D13] rounded-lg p-2 mt-1">Motivo: {cr.nota}</div>}
              </div>
            </div>
            <div className="flex gap-2 border-t border-[#D6E2EE] pt-2">
              <button
                onClick={() => onReviewChange(cr.id, "APPROVED")}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#E7F6EF] text-[#1B7F5A] hover:bg-[#d0efdf] transition"
              >✓ Aprovar</button>
              <button
                onClick={() => { const note = prompt("Motivo da rejeição (opcional):") ?? undefined; onReviewChange(cr.id, "REJECTED", note); }}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FDEAEA] text-[#A13B3B] hover:bg-[#fad3d3] transition"
              >✕ Rejeitar</button>
            </div>
          </div>
        ))}
      </div>
    )}

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
  dbEquipes: string[];
}

export const TabResultadosEquipe: React.FC<ResultadosEquipeProps> = ({
  resumo, totais, onOpenModal, onExportCsv,
  onExportSheets, sheetsStatus, sheetsError, isSuperUser, dbEquipes,
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
          {dbEquipes.map((eq, i) => (
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
            {COLS.map(({ key, fmt }) => (
              <td key={key} className="p-3 text-sm">
                <button
                  onClick={() => onOpenModal(key, "")}
                  disabled={!totais[key]}
                  className="font-extrabold underline disabled:no-underline disabled:opacity-60 text-white text-sm"
                >
                  {fmt(totais[key])}
                </button>
              </td>
            ))}
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
      <button onClick={onExportCsv} className={CLS.btnGhost}>⬇ Exportar CSV</button>
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
  onOpenModal: (key: IndicadorKey, equipe: string) => void;
  onExportCsv: () => void;
  onExportTabela2Csv: () => void;
  onExportRegistrosCsv: () => void;
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
  totais, usdTotal, onOpenModal, onExportCsv, onExportTabela2Csv, onExportRegistrosCsv,
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
                <Td className="min-w-[160px]">
                  <button
                    onClick={() => totais[key] > 0 ? onOpenModal(key, "") : undefined}
                    disabled={totais[key] === 0}
                    className="font-bold text-[#1A4F7A] underline disabled:no-underline disabled:text-[#5A7184] text-left hover:text-[#0F3254] transition"
                    title={totais[key] > 0 ? "Clique para ver os registros" : "Sem registros"}
                  >
                    {formatResult(totais, usdTotal)}
                  </button>
                </Td>
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
  const ano = new Date().getFullYear();
  const titulo = modalData.equipe
    ? `${modalData.equipe} — ${INDICADORES[modalData.key]}`
    : `CIATEN ${ano} — ${INDICADORES[modalData.key]}`;

  return (
    <div className="fixed inset-0 bg-[#0F2332]/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-[#D6E2EE] rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-start gap-3 p-6 border-b border-[#D6E2EE]">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#1C2B3A] break-words leading-snug">{titulo}</h2>
            <p className="text-xs text-[#5A7184] mt-1">
              {registrosModal.length} registro{registrosModal.length !== 1 ? "s" : ""} aprovado{registrosModal.length !== 1 ? "s" : ""}
              {modalData.equipe ? "" : " em todas as equipes"}
            </p>
          </div>
          <button onClick={onClose} className={`${CLS.btnSecondary} text-sm shrink-0`}>✕ Fechar</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-3">
          {!registrosModal.length ? (
            <p className="text-center py-8 text-[#5A7184]">Nenhum registro aprovado nesta categoria.</p>
          ) : registrosModal.map((r, idx) => (
            <div key={r.id} className="border border-[#D6E2EE] rounded-xl p-4 hover:bg-[#F5F7FA] transition space-y-2">
              {/* Número + nome */}
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-[#1A4F7A] text-white text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <b className="block text-sm text-[#1C2B3A] break-words">{r.nome}</b>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {!modalData.equipe && <span className="text-xs font-semibold text-[#1A4F7A]">{r.equipe}</span>}
                    {r.tipo && <span className="text-xs text-[#5A7184]">Tipo: {r.tipo}</span>}
                    {r.statusAtividade && <span className="text-xs text-[#5A7184]">Status: {r.statusAtividade}</span>}
                    {r.dataRealizacao && <span className="text-xs text-[#5A7184]">Data: {r.dataRealizacao}</span>}
                  </div>
                </div>
              </div>

              {/* Detalhes extras */}
              <div className="pl-10 space-y-1">
                {r.participantes && (
                  <p className="text-xs text-[#5A7184]">👥 Participantes: <span className="text-[#1C2B3A]">{r.participantes}</span></p>
                )}
                {r.canal && (
                  <p className="text-xs text-[#5A7184]">📢 Canal: <span className="text-[#1C2B3A]">{r.canal}</span></p>
                )}
                {r.alcance && (
                  <p className="text-xs text-[#5A7184]">📊 Alcance: <span className="text-[#1C2B3A]">{Number(r.alcance).toLocaleString("pt-BR")} interações</span></p>
                )}
                {r.financiador && (
                  <p className="text-xs text-[#5A7184]">🏦 Financiador: <span className="text-[#1C2B3A]">{r.financiador}</span></p>
                )}
                {r.valorAprovado && (
                  <p className="text-xs text-[#5A7184]">💰 Valor: <span className="text-[#1C2B3A] font-semibold">
                    {Number(r.valorAprovado).toLocaleString("pt-BR", { style: "currency", currency: r.moeda || "BRL" })}
                  </span></p>
                )}
                {r.evidencia && (
                  <a href={r.evidencia} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#1A4F7A] font-bold hover:underline break-all">
                    🔗 Abrir evidência ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
