/**
 * domain.ts — Lógica de domínio pura da página annualActionsReport.
 * Zero JSX, zero React. Tipos, constantes e helpers de negócio.
 *
 * DbRegistro: shape que vem da API (banco de dados via Prisma).
 * Os campos refletem ActivityRecord + relações include.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────
export type ValidacaoStatus = "Pendente" | "Sim" | "Não" | "Ajuste solicitado";
export type ActivityStatus  = "PENDING" | "APPROVED" | "REJECTED" | "ADJUSTMENT_NEEDED";

export type IndicadorKey =
  | "politicas"
  | "publicacoes"
  | "cursos"
  | "tecnologia"
  | "divulgacao"
  | "recursos";

/** Shape do registro retornado pela API (DB). */
export type DbRegistro = {
  id:              string;
  authorId:        string;
  ano:             number;
  equipe:          string;
  indicadorKey:    IndicadorKey;
  indicador:       string;
  nome:            string;
  tipo?:           string | null;
  statusAtividade?:string | null;
  evidencia?:      string | null;
  dataRealizacao?: string | null;
  participantes?:  string | null;
  canal?:          string | null;
  alcance?:        string | null;
  financiador?:    string | null;
  valorAprovado?:  string | null;
  moeda?:          string | null;
  activityStatus:  ActivityStatus;
  notaValidacao?:  string | null;
  validatedById?:  string | null;
  validatedAt?:    string | null;
  syncedToSheets:  boolean;
  syncedAt?:       string | null;
  createdAt:       string;
  updatedAt:       string;
  ultimaEdicao?:   string | null;
  author:          { id: string; name: string | null; email: string };
  validatedBy?:    { id: string; name: string | null } | null;
};

/** Alias de compatibilidade — o hook usa DbRegistro diretamente agora. */
export type Registro = DbRegistro;

// ─── Constantes de domínio ───────────────────────────────────────────────────
export const EQUIPES = [
  "Lilian e Antônio",
  "Olívia e Gabriel",
  "Márcio e Malvina",
  "Vagner e Regiane",
  "Vinícius, Kelson e Victor",
  "Victor Barbosa",
  "Dorcas e Andressa",
  "Fábio e Roni",
  "Ângelo e Anathália",
] as const;

export type Equipe = (typeof EQUIPES)[number];

export const INDICADORES: Record<IndicadorKey, string> = {
  politicas:   "Documento de recomendação para políticas públicas",
  publicacoes: "Número de publicações científicas",
  cursos:      "Número de cursos, eventos científicos ou outras ações realizadas por período",
  tecnologia:  "Número de projetos voltados ao desenvolvimento de fármacos, dispositivos biotecnológicos e outras tecnologias",
  divulgacao:  "Alcance de Divulgação nas Redes Sociais",
  recursos:    "Captação de Recursos para Pesquisa, Inovação e Eventos",
};

export const INDICADOR_LABEL_CURTO: Record<IndicadorKey, string> = {
  politicas:   "Doc. Políticas Públicas",
  publicacoes: "Publicações Científicas",
  cursos:      "Cursos / Eventos / Ações",
  tecnologia:  "Projetos Tecnológicos",
  divulgacao:  "Alcance Divulgação",
  recursos:    "Captação de Recursos",
};

export const TIPOS: Record<IndicadorKey, string[]> = {
  politicas:   ["Mapa de evidências", "Síntese de Evidências para Políticas – SEP", "Nota técnica", "Relatório técnico", "Documento de recomendação", "Plano de ação", "Protocolo", "Diretriz", "Outro"],
  publicacoes: ["Artigo", "Preprint", "Capítulo de livro", "Livro", "Relatório técnico com ISSN/ISBN", "Outro"],
  cursos:      ["Curso", "Oficina", "Workshop", "Seminário", "Congresso", "Webinar", "Capacitação", "Campanha educativa/formativa", "Outra ação"],
  tecnologia:  ["Software", "Sistema", "Dashboard/painel", "Chatbot", "Aplicativo", "Linha de cuidado digital", "Biobanco", "Dispositivo", "Produto biotecnológico", "Protótipo", "Outro"],
  divulgacao:  ["Post", "Reel", "Story", "Vídeo", "Entrevista", "Matéria", "Campanha", "Podcast", "Outro"],
  recursos:    [],
};

export const STATUSES: Record<IndicadorKey, string[]> = {
  politicas:   ["Planejado", "Em andamento", "Concluído", "Cancelado"],
  publicacoes: ["Em elaboração", "Submetido", "Aceito", "Publicado"],
  cursos:      ["Planejado", "Em andamento", "Concluído", "Cancelado"],
  tecnologia:  ["Ideação", "Desenvolvimento", "Protótipo funcional", "Piloto", "Implementado"],
  divulgacao:  [],
  recursos:    ["Em elaboração", "Submetido", "Em análise", "Aprovado", "Não aprovado", "Recurso recebido"],
};

export const CANAIS = [
  "Instagram CIATEN", "Instagram parceiro", "YouTube", "Site",
  "TV", "Rádio", "Podcast", "Imprensa escrita/digital", "Outro",
] as const;

// ─── Estado inicial do formulário ────────────────────────────────────────────
export const INITIAL_FORM_STATE = {
  editingId:      null as string | null,
  equipeSel:      "",
  indicadorSel:   "" as IndicadorKey | "",
  nome:           "",
  tipo:           "",
  statusAtividade:"",
  evidencia:      "",
  dataRealizacao: "",
  participantes:  "",
  canal:          "",
  alcance:        "",
  financiador:    "",
  valorAprovado:  "",
  moeda:          "BRL",
};
export type FormState = typeof INITIAL_FORM_STATE;

// ─── Helpers de negócio ──────────────────────────────────────────────────────

/** Mapeia ActivityStatus para o rótulo visual. */
export const STATUS_LABEL: Record<ActivityStatus, string> = {
  PENDING:           "Pendente",
  APPROVED:          "Aprovado",
  REJECTED:          "Não contabilizado",
  ADJUSTMENT_NEEDED: "Ajuste solicitado",
};

/**
 * Retorna 1 se o registro deve ser contabilizado nos totais.
 * Só registros APPROVED são contabilizados.
 */
export function contabiliza(r: DbRegistro): number {
  if (r.activityStatus !== "APPROVED" || !r.evidencia) return 0;
  const { indicadorKey: k, statusAtividade: s } = r;
  if (k === "politicas" || k === "cursos")  return s === "Concluído" ? 1 : 0;
  if (k === "publicacoes") return ["Aceito", "Publicado"].includes(s ?? "") ? 1 : 0;
  if (k === "tecnologia")  return ["Piloto", "Implementado"].includes(s ?? "") ? 1 : 0;
  if (k === "divulgacao")  return 1;
  if (k === "recursos")    return ["Aprovado", "Recurso recebido"].includes(s ?? "") ? 1 : 0;
  return 0;
}
