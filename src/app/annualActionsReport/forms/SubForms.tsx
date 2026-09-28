/**
 * SubForms.tsx — Os 6 sub-formulários específicos por indicador.
 */
import React from "react";
import { CLS } from "@/styles/tokens";
import { SelectField, TextField } from "./FieldComponents";
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
    <TextField label="Data de realização" value={dataRealizacao!} onChange={setDataRealizacao!} type="date" />
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


/**
 * CurrencyField — input estilo banco (dígito a dígito, sempre formatado).
 * O usuário digita os números e o valor se atualiza em tempo real.
 * Ex: digita 1 → "0,01" | digita 0 → "0,10" | digita 0 → "1,00" | digita 0 → "10,00"
 *
 * O que vai para o banco: string com o número em ponto flutuante "1234.56"
 */
function CurrencyField({
  label, value, onChange, required, moeda = "BRL",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  moeda?: string;
}) {
  const toCents = (v: string) => {
    if (!v) return 0;
    const n = parseFloat(v);
    if (isNaN(n)) return 0;
    return Math.round(n * 100);
  };

  const [cents, setCents] = React.useState<number>(toCents(value));

  React.useEffect(() => {
    if (!value || value === "0" || value === "0.00") setCents(0);
  }, [value]);

  // Formata centavos de acordo com a moeda selecionada
  const ISO_CODES = ["BRL","USD","EUR","GBP","JPY","CAD","AUD","CHF","CNY"];
  const isISO = ISO_CODES.includes(moeda);
  const isOutra = !isISO && moeda !== "";

  const display = isISO
    ? (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: moeda, minimumFractionDigits: 2 })
    : isOutra
    ? `${moeda} ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }); // moeda não definida: sem prefixo

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      const next = Math.min(cents * 10 + parseInt(e.key), 999_999_999_99);
      setCents(next);
      onChange((next / 100).toFixed(2));
    } else if (e.key === "Backspace") {
      e.preventDefault();
      const next = Math.floor(cents / 10);
      setCents(next);
      onChange((next / 100).toFixed(2));
    } else if (e.key === "Delete") {
      e.preventDefault();
      setCents(0);
      onChange("0.00");
    }
  }

  return (
    <div>
      <label className={CLS.label}>{label}{required && " *"}</label>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onKeyDown={handleKeyDown}
        onChange={() => {}}
        required={required}
        className={`${CLS.input} font-mono tracking-wide`}
      />
    </div>
  );
}

export const FormFeatures: React.FC<FormRecursosProps> = ({ status, setStatus, financiador, setFinanciador, valorAprovado, setValorAprovado, moeda, setMoeda, evidencia, setEvidencia, STATUSES }) => (
  <SubFormCard title="Captação de recursos">
    <TextField label="Instituição financiadora" value={financiador!} onChange={setFinanciador!} placeholder="Ex.: FAPEPI" required />
    <SelectField label="Situação" value={status!} onChange={setStatus!} options={STATUSES.recursos} required />
    {["Aprovado", "Recurso recebido"].includes(status ?? "") && (
      <>
        <CurrencyField
          label="Valor aprovado"
          value={valorAprovado!}
          onChange={setValorAprovado!}
          moeda={moeda!}
          required
        />
        <div>
          <label className={CLS.label}>Moeda *</label>
          <select
            value={["BRL","USD","EUR"].includes(moeda!) ? moeda! : "Outra"}
            onChange={(e) => {
              if (e.target.value !== "Outra") setMoeda!(e.target.value);
              else setMoeda!(""); // limpa para o usuário digitar
            }}
            required
            className={CLS.input}
          >
            <option value="">Selecione</option>
            <option value="BRL">BRL — Real brasileiro</option>
            <option value="USD">USD — Dólar americano</option>
            <option value="EUR">EUR — Euro</option>
            <option value="Outra">Outra</option>
          </select>
          {/* Mostramos o campo de texto quando NÃO é BRL/USD/EUR */}
          {!["BRL","USD","EUR"].includes(moeda!) && (
            <input
              type="text"
              value={moeda!}
              onChange={(e) => setMoeda!(e.target.value.toUpperCase())}
              placeholder="Ex.: GBP, JPY, CHF..."
              className={`${CLS.input} mt-1`}
              maxLength={10}
              autoFocus
            />
          )}
        </div>
      </>
    )}
    <TextField label="Evidência / link" value={evidencia!} onChange={setEvidencia!} type="url" placeholder="https://" required={["Aprovado","Recurso recebido"].includes(status ?? "")} colSpan="full" />
  </SubFormCard>
);
