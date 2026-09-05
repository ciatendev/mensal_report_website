/**
 * domain.ts — Lógica de domínio pura da página annualActionsReport.
 * Zero JSX, zero React. Tipos, constantes e helpers de negócio.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────
export type ValidacaoStatus = "Pendente" | "Sim" | "Não" | "Ajuste solicitado";

export type IndicadorKey =
  | "politicas"
  | "publicacoes"
  | "cursos"
  | "tecnologia"
  | "divulgacao"
  | "recursos";

export type Registro = {
  id: string;
  timestamp: string;
  ano: number;
  equipe: string;
  indicador_key: IndicadorKey;
  indicador: string;
  nome: string;
  tipo?: string;
  status?: string;
  evidencia?: string;
  data_realizacao?: string;
  participantes?: string;
  canal?: string;
  alcance?: string;
  financiador?: string;
  valor_aprovado?: string;
  moeda?: string;
  validado: ValidacaoStatus;
  nota_validacao?: string;
  data_validacao?: string;
  ultima_edicao?: string;
};

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
  "Instagram CIATEN",
  "Instagram parceiro",
  "YouTube",
  "Site",
  "TV",
  "Rádio",
  "Podcast",
  "Imprensa escrita/digital",
  "Outro",
] as const;

// ─── Estado inicial do formulário ────────────────────────────────────────────
export const INITIAL_FORM_STATE = {
  editingId:      null as string | null,
  equipeSel:      "",
  indicadorSel:   "" as IndicadorKey | "",
  nome:           "",
  tipo:           "",
  status:         "",
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
export function contabiliza(r: Registro): number {
  if (r.validado !== "Sim" || !r.evidencia) return 0;
  const { indicador_key: k, status: s } = r;
  if (k === "politicas" || k === "cursos") return s === "Concluído" ? 1 : 0;
  if (k === "publicacoes") return ["Aceito", "Publicado"].includes(s ?? "") ? 1 : 0;
  if (k === "tecnologia")  return ["Piloto", "Implementado"].includes(s ?? "") ? 1 : 0;
  if (k === "divulgacao")  return 1;
  if (k === "recursos")    return ["Aprovado", "Recurso recebido"].includes(s ?? "") ? 1 : 0;
  return 0;
}

export function buildRegistro(fields: Omit<FormState, "editingId">): Registro {
  const key = fields.indicadorSel as IndicadorKey;
  return {
    id:              Date.now().toString(),
    timestamp:       new Date().toISOString(),
    ano:             new Date().getFullYear(),
    equipe:          fields.equipeSel,
    indicador_key:   key,
    indicador:       INDICADORES[key],
    nome:            fields.nome,
    tipo:            key === "recursos" ? "Captação de recursos" : fields.tipo,
    status:          key === "divulgacao" ? "Publicado" : fields.status,
    evidencia:       fields.evidencia,
    data_realizacao: fields.dataRealizacao,
    participantes:   fields.participantes,
    canal:           fields.canal,
    alcance:         fields.alcance,
    financiador:     fields.financiador,
    valor_aprovado:  fields.valorAprovado,
    moeda:           fields.moeda,
    validado:        "Pendente",
  };
}
