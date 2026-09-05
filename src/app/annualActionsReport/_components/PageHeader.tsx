/**
 * PageHeader.tsx — Cabeçalho da página com logo CIATEN e tabs de navegação.
 */
import React from "react";
import { CLS } from "@/styles/tokens";
import type { TabId } from "../_hooks/useAnnualReport";

const TABS: { id: TabId; label: string }[] = [
  { id: "registro",           label: "Novo Registro" },
  { id: "meus-registros",     label: "Meus Registros" },
  { id: "validacao",          label: "Validação" },
  { id: "resultados-equipe",  label: "Por Equipe" },
  { id: "resultados-ciaten",  label: "Síntese CIATEN" },
];

interface Props {
  activeTab: TabId;
  onTabChange: (t: TabId) => void;
  onSignOut: () => void;
}

export const PageHeader: React.FC<Props> = ({ activeTab, onTabChange, onSignOut }) => (
  <header className="bg-white border-b border-[#D6E2EE] shadow-sm mb-6">
    <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ciaten-logo.png" alt="CIATEN" className="h-10 w-10 object-contain" />
        <div>
          <div className="text-[#1A4F7A] font-extrabold text-lg leading-tight">CIATEN</div>
          <div className="text-[#5A7184] text-xs">Registro de Resultados {new Date().getFullYear()}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => onTabChange(tab.id)}
            className={activeTab === tab.id ? CLS.tabActive : CLS.tabInactive}>
            {tab.label}
          </button>
        ))}
        <button onClick={onSignOut} className={`${CLS.btnSecondary} text-xs`}>Sair</button>
      </div>
    </div>
  </header>
);
