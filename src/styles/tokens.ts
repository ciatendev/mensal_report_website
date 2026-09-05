/**
 * tokens.ts — Design Tokens do CIATEN
 * Fonte única de verdade para cores, tipografia e sombras.
 * Paleta extraída do site oficial ciaten.org.br:
 *   - Azul primário  : #1A4F7A (navbar, botões principais)
 *   - Laranja acento : #E85D1F (CTA, "read more", destaques)
 *   - Fundo claro    : #F5F7FA
 *   - Texto escuro   : #1C2B3A
 *   - Bordas         : #D6E2EE
 */

export const C = {
  primary:      "#1A4F7A",
  primaryLight: "#E8F1F8",
  primaryDark:  "#0F3254",
  accent:       "#E85D1F",
  accentLight:  "#FEF0E9",
  bg:           "#F5F7FA",
  surface:      "#FFFFFF",
  surfaceAlt:   "#F0F4F8",
  text:         "#1C2B3A",
  textMuted:    "#5A7184",
  border:       "#D6E2EE",
  success:      "#1B7F5A",
  successBg:    "#E7F6EF",
  warning:      "#8B6200",
  warningBg:    "#FFF4D6",
  error:        "#A13B3B",
  errorBg:      "#FDEAEA",
  pendingBg:    "#FFF8E7",
  pendingText:  "#795D13",
} as const;

export const CLS = {
  card:         "bg-white border border-[#D6E2EE] rounded-2xl shadow-[0_4px_20px_rgba(26,79,122,0.07)]",
  cardInner:    "bg-[#F0F4F8] border border-[#D6E2EE] rounded-xl",
  input:        "w-full border border-[#D6E2EE] rounded-xl p-2.5 bg-white text-[#1C2B3A] focus:outline-none focus:ring-2 focus:ring-[#1A4F7A]/30 transition",
  label:        "block text-sm font-semibold mb-1 text-[#1C2B3A]",
  btnPrimary:   "px-4 py-2.5 bg-[#1A4F7A] text-white font-bold rounded-xl hover:bg-[#0F3254] transition disabled:opacity-50 disabled:cursor-not-allowed",
  btnSecondary: "px-4 py-2.5 bg-white border border-[#D6E2EE] text-[#1C2B3A] font-bold rounded-xl hover:bg-[#F0F4F8] transition",
  btnGhost:     "px-4 py-2.5 bg-[#E8F1F8] text-[#1A4F7A] font-bold rounded-xl hover:bg-[#d4e5f3] transition",
  tabActive:    "px-4 py-2 text-sm font-semibold rounded-xl border bg-[#1A4F7A] text-white border-[#1A4F7A] transition",
  tabInactive:  "px-4 py-2 text-sm font-semibold rounded-xl border bg-white text-[#1C2B3A] border-[#D6E2EE] hover:bg-[#F0F4F8] transition",
  badgePending: "bg-[#FFF4D6] text-[#8B6200] px-2 py-0.5 rounded-full text-xs font-bold",
  badgeSuccess: "bg-[#E7F6EF] text-[#1B7F5A] px-2 py-0.5 rounded-full text-xs font-bold",
  badgeError:   "bg-[#FDEAEA] text-[#A13B3B] px-2 py-0.5 rounded-full text-xs font-bold",
  badgeInfo:    "bg-[#E8F1F8] text-[#1A4F7A] px-2 py-0.5 rounded-full text-xs font-bold",
  th:           "p-3 text-left text-xs font-bold text-[#5A7184] uppercase tracking-wider",
  td:           "p-3 text-sm text-[#1C2B3A]",
} as const;
