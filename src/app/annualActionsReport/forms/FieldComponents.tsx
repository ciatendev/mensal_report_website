/**
 * FieldComponents.tsx — Componentes atômicos de campo reutilizáveis.
 */
import React from "react";
import { CLS } from "@/styles/tokens";

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
  placeholder?: string;
  colSpan?: "full";
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label, value, onChange, options, required, placeholder = "Selecione", colSpan,
}) => (
  <div className={colSpan === "full" ? "md:col-span-2" : undefined}>
    <label className={CLS.label}>{label}{required && " *"}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} required={required} className={CLS.input}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "url" | "number" | "date";
  placeholder?: string;
  required?: boolean;
  min?: string;
  step?: string;
  colSpan?: "full";
}

export const TextField: React.FC<TextFieldProps> = ({
  label, value, onChange, type = "text", placeholder, required, min, step, colSpan,
}) => (
  <div className={colSpan === "full" ? "md:col-span-2" : undefined}>
    <label className={CLS.label}>{label}{required && " *"}</label>
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} required={required} min={min} step={step}
      className={CLS.input}
    />
  </div>
);

/**
 * MonthYearField — Usa input type="date" nativo (abre calendário no browser).
 * Armazena apenas "YYYY-MM" descartando o dia, compatível com Firefox e Chrome.
 */
interface MonthYearFieldProps {
  label: string;
  value: string;          // "YYYY-MM" ou ""
  onChange: (v: string) => void;
  required?: boolean;
  colSpan?: "full";
}

export const MonthYearField: React.FC<MonthYearFieldProps> = ({
  label, value, onChange, required, colSpan,
}) => (
  <div className={colSpan === "full" ? "md:col-span-2" : undefined}>
    <label className={CLS.label}>{label}{required && " *"}</label>
    {/*
      Estratégia: usa input type="month" como primeiro choice (Chrome/Edge/Safari).
      Firefox não suporta type="month" — ele renderiza como texto.
      Para compatibilidade total, usamos type="date" mas exibimos e armazenamos YYYY-MM:
      - value: se já é "YYYY-MM", adiciona "-15" (meio do mês) para o calendário abrir
        no mês correto sem forçar o dia 1.
      - onChange: extrai slice(0,7) para obter "YYYY-MM".
    */}
    <input
      type="date"
      value={value ? `${value}-15` : ""}
      onChange={(e) => {
        const v = e.target.value; // "YYYY-MM-DD"
        onChange(v ? v.slice(0, 7) : ""); 
      }}
      required={required}
      className={CLS.input}
    />
    {value && (
      <p className="text-xs text-[#5A7184] mt-1">
        Mês selecionado: {new Date(`${value}-15`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
      </p>
    )}
  </div>
);
