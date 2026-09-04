import React from "react";
import { FormBaseProps } from "./forms";

export const FormPublications: React.FC<FormBaseProps> = ({
  tipo,
  setTipo,
  status,
  setStatus,
  evidencia,
  setEvidencia,
  TIPOS,
  STATUSES,
}) => (
    <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] space-y-3">
        <h2 className="text-lg font-bold m-0">Publicação científica</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
            <label className="block text-sm font-bold mb-1">Tipo *</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                <option value="">Selecione</option>
                {TIPOS.publicacoes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            </div>
            <div>
            <label className="block text-sm font-bold mb-1">Situação *</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                <option value="">Selecione</option>
                {STATUSES.publicacoes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            </div>
            <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1">DOI ou link *</label>
            <input type="url" value={evidencia} onChange={(e) => setEvidencia(e.target.value)} required placeholder="https://" className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
            </div>
        </div>
    </div>
);