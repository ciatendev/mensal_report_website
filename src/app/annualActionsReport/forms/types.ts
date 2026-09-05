/**
 * types.ts — Interfaces TypeScript dos sub-formulários.
 */
import type { IndicadorKey } from "./domain";

export interface FormBaseProps {
  tipo:               string;
  setTipo:            (v: string) => void;
  status?:            string;
  setStatus?:         (v: string) => void;
  evidencia?:         string;
  setEvidencia?:      (v: string) => void;
  dataRealizacao?:    string;
  setDataRealizacao?: (v: string) => void;
  participantes?:     string;
  setParticipantes?:  (v: string) => void;
  canal?:             string;
  setCanal?:          (v: string) => void;
  alcance?:           string;
  setAlcance?:        (v: string) => void;
  financiador?:       string;
  setFinanciador?:    (v: string) => void;
  valorAprovado?:     string;
  setValorAprovado?:  (v: string) => void;
  moeda?:             string;
  setMoeda?:          (v: string) => void;
  TIPOS:              Record<IndicadorKey, string[]>;
  STATUSES:           Record<IndicadorKey, string[]>;
  CANAIS?:            readonly string[];
}

export type FormPoliticasProps   = Pick<FormBaseProps, "tipo"|"setTipo"|"status"|"setStatus"|"evidencia"|"setEvidencia"|"TIPOS"|"STATUSES">;
export type FormPublicacoesProps = Pick<FormBaseProps, "tipo"|"setTipo"|"status"|"setStatus"|"evidencia"|"setEvidencia"|"TIPOS"|"STATUSES">;
export type FormCursosProps      = Pick<FormBaseProps, "tipo"|"setTipo"|"status"|"setStatus"|"evidencia"|"setEvidencia"|"dataRealizacao"|"setDataRealizacao"|"participantes"|"setParticipantes"|"TIPOS"|"STATUSES">;
export type FormTecnologiaProps  = Pick<FormBaseProps, "tipo"|"setTipo"|"status"|"setStatus"|"evidencia"|"setEvidencia"|"TIPOS"|"STATUSES">;
export type FormDivulgacaoProps  = Pick<FormBaseProps, "tipo"|"setTipo"|"canal"|"setCanal"|"alcance"|"setAlcance"|"evidencia"|"setEvidencia"|"TIPOS"|"CANAIS">;
export type FormRecursosProps    = Pick<FormBaseProps, "status"|"setStatus"|"financiador"|"setFinanciador"|"valorAprovado"|"setValorAprovado"|"moeda"|"setMoeda"|"evidencia"|"setEvidencia"|"STATUSES">;
