/**
 * TabRegistro.tsx — Aba de novo registro / edição.
 */
import React from "react";
import { signOut } from "next-auth/react";
import { CLS } from "@/styles/tokens";
import { EQUIPES, INDICADORES, TIPOS, STATUSES, CANAIS, IndicadorKey } from "../forms/domain";
import { FormPoliticas, FormPublications, FormCourses, FormTechnology, FormDisclouse, FormFeatures } from "../forms/SubForms";
import type { SubmitStatus } from "../_hooks/useAnnualReport";

interface Props {
  editingId: string | null;
  equipeSel: string;         setEquipeSel: (v: string) => void;
  indicadorSel: IndicadorKey | ""; setIndicadorSel: (v: IndicadorKey | "") => void;
  nome: string;              setNome: (v: string) => void;
  tipo: string;              setTipo: (v: string) => void;
  status: string;            setStatus: (v: string) => void;
  evidencia: string;         setEvidencia: (v: string) => void;
  dataRealizacao: string;    setDataRealizacao: (v: string) => void;
  participantes: string;     setParticipantes: (v: string) => void;
  canal: string;             setCanal: (v: string) => void;
  alcance: string;           setAlcance: (v: string) => void;
  financiador: string;       setFinanciador: (v: string) => void;
  valorAprovado: string;     setValorAprovado: (v: string) => void;
  moeda: string;             setMoeda: (v: string) => void;
  submitStatus: SubmitStatus;
  submitError: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
}

export const TabRegistro: React.FC<Props> = (p) => {
  const formProps = {
    tipo: p.tipo, setTipo: p.setTipo, status: p.status, setStatus: p.setStatus,
    evidencia: p.evidencia, setEvidencia: p.setEvidencia,
    dataRealizacao: p.dataRealizacao, setDataRealizacao: p.setDataRealizacao,
    participantes: p.participantes, setParticipantes: p.setParticipantes,
    canal: p.canal, setCanal: p.setCanal, alcance: p.alcance, setAlcance: p.setAlcance,
    financiador: p.financiador, setFinanciador: p.setFinanciador,
    valorAprovado: p.valorAprovado, setValorAprovado: p.setValorAprovado,
    moeda: p.moeda, setMoeda: p.setMoeda, TIPOS, STATUSES, CANAIS,
  };

  return (
    <form onSubmit={p.onSubmit} className="space-y-4">
      {p.editingId && (
        <div className="border border-[#f0d692] bg-[#FFF8E7] text-[#795D13] rounded-xl p-3 flex justify-between items-center gap-3">
          <div>
            <b>Corrigindo um registro devolvido.</b>
            <p className="text-xs text-[#5A7184] mt-0.5">Faça o ajuste e reenvie. O registro voltará para validação.</p>
          </div>
          <button type="button" onClick={p.onReset} className={`${CLS.btnSecondary} text-xs`}>Cancelar</button>
        </div>
      )}

      {p.submitStatus === "success" && (
        <div className="border border-[#a3d9b8] bg-[#E7F6EF] text-[#1B7F5A] rounded-xl p-3 font-semibold">
          ✓ Registro salvo com sucesso na planilha do Google Sheets.
        </div>
      )}
      {p.submitStatus === "error" && (
        <div className="border border-[#f5c6c6] bg-[#FDEAEA] text-[#A13B3B] rounded-xl p-3">
          <b>Erro ao salvar:</b> {p.submitError}
          <p className="text-xs mt-1">Os dados foram mantidos. Verifique a conexão e tente novamente.</p>
        </div>
      )}

      <div className={`${CLS.card} p-5 space-y-4`}>
        <h2 className="text-base font-bold text-[#1A4F7A] border-b border-[#D6E2EE] pb-2">Dados do registro</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={CLS.label}>Equipe *</label>
            <select value={p.equipeSel} onChange={(e) => p.setEquipeSel(e.target.value)} required className={CLS.input}>
              <option value="">Selecione</option>
              {EQUIPES.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          </div>
          <div>
            <label className={CLS.label}>Indicador *</label>
            <select value={p.indicadorSel}
              onChange={(e) => { p.setIndicadorSel(e.target.value as IndicadorKey | ""); p.setTipo(""); p.setStatus(""); }}
              required className={CLS.input}>
              <option value="">Selecione</option>
              {Object.entries(INDICADORES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={CLS.label}>Nome do produto / atividade *</label>
            <input type="text" value={p.nome} onChange={(e) => p.setNome(e.target.value)}
              placeholder="Ex.: Mapa de Evidências sobre Raiva" required className={CLS.input} />
          </div>
        </div>
      </div>

      {p.indicadorSel === "politicas"   && <FormPoliticas   {...formProps} />}
      {p.indicadorSel === "publicacoes" && <FormPublications {...formProps} />}
      {p.indicadorSel === "cursos"      && <FormCourses     {...formProps} />}
      {p.indicadorSel === "tecnologia"  && <FormTechnology  {...formProps} />}
      {p.indicadorSel === "divulgacao"  && <FormDisclouse   {...formProps} />}
      {p.indicadorSel === "recursos"    && <FormFeatures    {...formProps} />}

      <div className={`${CLS.card} p-4`}>
        <p className="text-xs text-[#5A7184] mb-3">ID, data/hora, ano e validação são gerados automaticamente.</p>
        <div className="flex gap-2 flex-wrap items-center">
          <button type="submit" disabled={p.submitStatus === "loading"} className={`${CLS.btnPrimary} flex items-center gap-2`}>
            {p.submitStatus === "loading" && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />}
            {p.submitStatus === "loading" ? "Salvando…" : p.editingId ? "Reenviar para validação" : "Enviar registro"}
          </button>
          <button type="button" onClick={p.onReset} className={CLS.btnSecondary}>Limpar</button>
          <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={CLS.btnGhost}>Sair</button>
        </div>
      </div>
    </form>
  );
};
