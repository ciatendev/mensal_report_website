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
    {/* value precisa de "YYYY-MM-DD" — completamos com "-01".
        onChange extrai só "YYYY-MM" (slice 0–7) descartando o dia. */}
    <input
      type="date"
      value={value ? `${value}-01` : ""}
      onChange={(e) => onChange(e.target.value ? e.target.value.slice(0, 7) : "")}
      required={required}
      className={CLS.input}
    />
  </div>
);
