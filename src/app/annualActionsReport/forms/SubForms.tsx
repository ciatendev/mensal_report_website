/**
 * SubForms.tsx — Os 6 sub-formulários específicos por indicador.
 */
import React from "react";
import { CLS } from "@/styles/tokens";
import { SelectField, TextField, MonthYearField } from "./FieldComponents";
import type {
  FormPoliticasProps, FormPublicacoesProps, FormCursosProps,
  FormTecnologiaProps, FormDivulgacaoProps, FormRecursosProps,
} from "./types";

const SubFormCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className={`${CLS.card} p-5 space-y-3`}>
    <h2 className="text-base font-bold text-[#1C2B3A] border-b border-[#D6E2EE] pb-2">{title}</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
  </div>
);

export const FormPoliticas: React.FC<FormPoliticasProps> = ({ tipo, setTipo, status, setStatus, evidencia, setEvidencia, TIPOS, STATUSES }) => (
  <SubFormCard title="Políticas públicas">
    <SelectField label="Tipo de produto" value={tipo} onChange={setTipo!} options={TIPOS.politicas} required />
    <SelectField label="Situação" value={status!} onChange={setStatus!} options={STATUSES.politicas} required />
    <TextField label="Evidência / link" value={evidencia!} onChange={setEvidencia!} type="url" placeholder="https://" required={status === "Concluído"} colSpan="full" />
  </SubFormCard>
);

export const FormPublications: React.FC<FormPublicacoesProps> = ({ tipo, setTipo, status, setStatus, evidencia, setEvidencia, TIPOS, STATUSES }) => (
  <SubFormCard title="Publicação científica">
    <SelectField label="Tipo" value={tipo} onChange={setTipo!} options={TIPOS.publicacoes} required />
    <SelectField label="Situação" value={status!} onChange={setStatus!} options={STATUSES.publicacoes} required />
    <TextField label="DOI ou link" value={evidencia!} onChange={setEvidencia!} type="url" placeholder="https://" required={["Aceito","Publicado"].includes(status ?? "")} colSpan="full" />
  </SubFormCard>
);

export const FormCourses: React.FC<FormCursosProps> = ({ tipo, setTipo, status, setStatus, evidencia, setEvidencia, dataRealizacao, setDataRealizacao, participantes, setParticipantes, TIPOS, STATUSES }) => (
  <SubFormCard title="Curso, evento ou ação">
    <SelectField label="Tipo" value={tipo} onChange={setTipo!} options={TIPOS.cursos} required />
    <SelectField label="Situação" value={status!} onChange={setStatus!} options={STATUSES.cursos} required />
    <MonthYearField label="Mês de realização" value={dataRealizacao!} onChange={setDataRealizacao!} />
    <TextField label="Nº de participantes" value={participantes!} onChange={setParticipantes!} type="number" min="0" placeholder="Opcional" />
    <TextField label="Evidência / link" value={evidencia!} onChange={setEvidencia!} type="url" placeholder="https://" required={status === "Concluído"} colSpan="full" />
  </SubFormCard>
);

export const FormTechnology: React.FC<FormTecnologiaProps> = ({ tipo, setTipo, status, setStatus, evidencia, setEvidencia, TIPOS, STATUSES }) => (
  <SubFormCard title="Tecnologia e inovação">
    <SelectField label="Tipo" value={tipo} onChange={setTipo!} options={TIPOS.tecnologia} required />
    <SelectField label="Estágio atual" value={status!} onChange={setStatus!} options={STATUSES.tecnologia} required />
    <TextField label="Evidência / link" value={evidencia!} onChange={setEvidencia!} type="url" placeholder="https://" required={["Piloto","Implementado"].includes(status ?? "")} colSpan="full" />
  </SubFormCard>
);

export const FormDisclouse: React.FC<FormDivulgacaoProps> = ({ tipo, setTipo, canal, setCanal, alcance, setAlcance, evidencia, setEvidencia, TIPOS, CANAIS }) => (
  <SubFormCard title="Divulgação">
    <SelectField label="Canal" value={canal!} onChange={setCanal!} options={[...(CANAIS ?? [])]} required />
    <SelectField label="Tipo de conteúdo" value={tipo} onChange={setTipo!} options={TIPOS.divulgacao} required />
    <TextField label="Alcance" value={alcance!} onChange={setAlcance!} type="number" min="0" placeholder="Se disponível" />
    <TextField label="Link" value={evidencia!} onChange={setEvidencia!} type="url" placeholder="https://" required />
  </SubFormCard>
);

export const FormFeatures: React.FC<FormRecursosProps> = ({ status, setStatus, financiador, setFinanciador, valorAprovado, setValorAprovado, moeda, setMoeda, evidencia, setEvidencia, STATUSES }) => (
  <SubFormCard title="Captação de recursos">
    <TextField label="Instituição financiadora" value={financiador!} onChange={setFinanciador!} placeholder="Ex.: FAPEPI" required />
    <SelectField label="Situação" value={status!} onChange={setStatus!} options={STATUSES.recursos} required />
    {["Aprovado", "Recurso recebido"].includes(status ?? "") && (
      <>
        <TextField label="Valor aprovado" value={valorAprovado!} onChange={setValorAprovado!} type="number" step="0.01" min="0" required />
        <SelectField label="Moeda" value={moeda!} onChange={setMoeda!} options={["BRL", "USD", "EUR", "Outra"]} required />
      </>
    )}
    <TextField label="Evidência / link" value={evidencia!} onChange={setEvidencia!} type="url" placeholder="https://" required={["Aprovado","Recurso recebido"].includes(status ?? "")} colSpan="full" />
  </SubFormCard>
);
