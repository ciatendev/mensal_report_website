export type Registro = {
  id: string;
  timestamp: string;
  ano: number;
  equipe: string;
  indicador_key: string;
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
  validado: "Pendente" | "Sim" | "Não" | "Ajuste solicitado";
  nota_validacao?: string;
  data_validacao?: string;
  ultima_edicao?: string;
};

/** Interface unificada contendo todos os estados possíveis dos formulários */
export interface FormBaseProps {
  // Campos genéricos/comuns
  tipo: string;
  setTipo: (val: string) => void;
  status?: string;
  setStatus?: (val: string) => void;
  evidencia?: string;
  setEvidencia?: (val: string) => void;

  // Campos específicos
  dataRealizacao?: string;
  setDataRealizacao?: (val: string) => void;
  participantes?: string;
  setParticipantes?: (val: string) => void;
  canal?: string;
  setCanal?: (val: string) => void;
  alcance?: string;
  setAlcance?: (val: string) => void;
  financiador?: string;
  setFinanciador?: (val: string) => void;
  valorAprovado?: string;
  setValorAprovado?: (val: string) => void;
  moeda?: string;
  setMoeda?: (val: string) => void;

  // Domínio de Dados Passados como Prop
  TIPOS: Record<string, string[]>;
  STATUSES: Record<string, string[]>;
  CANAIS?: string[];
}

// Interfaces tipadas específicas para autocompletar correto dentro de cada subcomponente
export interface FormPoliticasProps extends Pick<FormBaseProps, "tipo" | "setTipo" | "status" | "setStatus" | "evidencia" | "setEvidencia" | "TIPOS" | "STATUSES"> {}

export interface FormPublicacoesProps extends Pick<FormBaseProps, "tipo" | "setTipo" | "status" | "setStatus" | "evidencia" | "setEvidencia" | "TIPOS" | "STATUSES"> {}

export interface FormCursosProps extends Pick<FormBaseProps, "tipo" | "setTipo" | "status" | "setStatus" | "evidencia" | "setEvidencia" | "dataRealizacao" | "setDataRealizacao" | "participantes" | "setParticipantes" | "TIPOS" | "STATUSES"> {}

export interface FormTecnologiaProps extends Pick<FormBaseProps, "tipo" | "setTipo" | "status" | "setStatus" | "evidencia" | "setEvidencia" | "TIPOS" | "STATUSES"> {}

export interface FormDivulgacaoProps extends Pick<FormBaseProps, "tipo" | "setTipo" | "canal" | "setCanal" | "alcance" | "setAlcance" | "evidencia" | "setEvidencia" | "TIPOS" | "CANAIS"> {}

export interface FormRecursosProps extends Pick<FormBaseProps, "status" | "setStatus" | "financiador" | "setFinanciador" | "STATUSES"> {}

export const EQUIPES = [
  "Lilian e Antônio", "Olívia e Gabriel", "Márcio e Malvina",
  "Vagner e Regiane", "Vinícius, Kelson e Victor", "Victor Barbosa",
  "Dorcas e Andressa", "Fábio e Roni", "Ângelo e Anathália"
] as const;

export const INDICADORES: Record<string, string> = {
  politicas: "Documento de recomendação para políticas públicas",
  publicacoes: "Número de publicações científicas",
  cursos: "Número de cursos, eventos científicos ou outras ações realizadas por período",
  tecnologia: "Número de projetos voltados ao desenvolvimento de fármacos, dispositivos biotecnológicos e outras tecnologias",
  divulgacao: "Alcance de Divulgação nas Redes Sociais",
  recursos: "Captação de Recursos para Pesquisa, Inovação e Eventos"
};

export const TIPOS: Record<string, string[]> = {
  politicas: ["Mapa de evidências", "Síntese de Evidências para Políticas – SEP", "Nota técnica", "Relatório técnico", "Documento de recomendação", "Plano de ação", "Protocolo", "Diretriz", "Outro"],
  publicacoes: ["Artigo", "Preprint", "Capítulo de livro", "Livro", "Relatório técnico com ISSN/ISBN", "Outro"],
  cursos: ["Curso", "Oficina", "Workshop", "Seminário", "Congresso", "Webinar", "Capacitação", "Campanha educativa/formativa", "Outra ação"],
  tecnologia: ["Software", "Sistema", "Dashboard/painel", "Chatbot", "Aplicativo", "Linha de cuidado digital", "Biobanco", "Dispositivo", "Produto biotecnológico", "Protótipo", "Outro"],
  divulgacao: ["Post", "Reel", "Story", "Vídeo", "Entrevista", "Matéria", "Campanha", "Podcast", "Outro"]
};

export const STATUSES: Record<string, string[]> = {
  politicas: ["Planejado", "Em andamento", "Concluído", "Cancelado"],
  publicacoes: ["Em elaboração", "Submetido", "Aceito", "Publicado"],
  cursos: ["Planejado", "Em andamento", "Concluído", "Cancelado"],
  tecnologia: ["Ideação", "Desenvolvimento", "Protótipo funcional", "Piloto", "Implementado"],
  recursos: ["Em elaboração", "Submetido", "Em análise", "Aprovado", "Não aprovado", "Recurso recebido"]
};

export const CANAIS = ["Instagram CIATEN", "Instagram parceiro", "YouTube", "Site", "TV", "Rádio", "Podcast", "Imprensa escrita/digital", "Outro"];

export const INITIAL_FORM_STATE = {
  editingId: null,
  equipeSel: "",
  indicadorSel: "",
  nome: "",
  tipo: "",
  status: "",
  evidencia: "",
  dataRealizacao: "",
  participantes: "",
  canal: "",
  alcance: "",
  financiador: "",
  valorAprovado: "",
  moeda: "BRL",
};