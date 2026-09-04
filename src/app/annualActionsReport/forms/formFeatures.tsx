import React from "react";
import { FormBaseProps } from "./forms";

export const FormFeatures: React.FC<FormBaseProps> = ({
  financiador,
  setFinanciador,
  status,
  setStatus,
  evidencia,
  setEvidencia,
  STATUSES,
  valorAprovado,
  setValorAprovado,
  moeda,
  setMoeda,
}) => (
    <div className="bg-white border border-[#dbe4ec] rounded-[16px] p-5 shadow-[0_8px_24px_rgba(31,95,139,0.06)] space-y-3">
        <h2 className="text-lg font-bold m-0">Captação de recursos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
            <label className="block text-sm font-bold mb-1">Instituição financiadora *</label>
            <input type="text" value={financiador} onChange={(e) => setFinanciador(e.target.value)} required placeholder="Ex.: FAPEPI" className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
            </div>
            <div>
            <label className="block text-sm font-bold mb-1">Situação *</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                <option value="">Selecione</option>
                {STATUSES.recursos.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            </div>

            {["Aprovado", "Recurso recebido"].includes(status) && (
            <>
                <div>
                <label className="block text-sm font-bold mb-1">Valor aprovado *</label>
                <input type="number" step="0.01" min="0" value={valorAprovado} onChange={(e) => setValorAprovado(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
                </div>
                <div>
                <label className="block text-sm font-bold mb-1">Moeda *</label>
                <select value={moeda} onChange={(e) => setMoeda(e.target.value)} required className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white">
                    <option value="BRL">BRL</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="Outra">Outra</option>
                </select>
                </div>
            </>
            )}

            <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-1">Evidência/link *</label>
            <input type="url" value={evidencia} onChange={(e) => setEvidencia(e.target.value)} required placeholder="https://" className="w-full border border-[#dbe4ec] rounded-[10px] p-2.5 bg-white" />
            </div>
        </div>
    </div>
);