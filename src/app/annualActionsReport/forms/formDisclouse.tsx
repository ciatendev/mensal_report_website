import React from "react";
import { FormBaseProps } from "./forms";

export const FormDisclouse: React.FC<FormBaseProps> = ({
  tipo,
  setTipo,
  canal,
  CANAIS,
  setCanal,
  evidencia,
  setEvidencia,
  TIPOS,
  setAlcance,
  alcance,
}) => (
    <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] space-y-3">
        <h2 className="text-lg font-bold m-0">Divulgação</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
            <label className="block text-sm font-bold mb-1">Canal *</label>
            <select value={canal} onChange={(e) => setCanal(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                <option value="">Selecione</option>
                {CANAIS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            </div>
            <div>
            <label className="block text-sm font-bold mb-1">Tipo de conteúdo *</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                <option value="">Selecione</option>
                {TIPOS.divulgacao.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            </div>
            <div>
            <label className="block text-sm font-bold mb-1">Alcance</label>
            <input type="number" min="0" value={alcance} onChange={(e) => setAlcance(e.target.value)} placeholder="Se disponível" className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
            </div>
            <div>
            <label className="block text-sm font-bold mb-1">Link *</label>
            <input type="url" value={evidencia} onChange={(e) => setEvidencia(e.target.value)} required placeholder="https://" className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
            </div>
        </div>
    </div>
);