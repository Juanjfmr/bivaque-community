/**
 * O servidor da prévia do F01. Cada função aqui tem a forma da chamada real que
 * a substitui quando o dono aprovar o ADR e a prévia — nada daqui vai para o
 * banco. O CPF não passa por este módulo: a tela só entrega "consultar" e
 * recebe o resultado, como o servidor real fará.
 */
import {
  type IdDaEtapa,
  type Progresso,
  progressoInicial,
  VERSAO_DO_FLUXO,
  type Verificacao,
  type Via,
} from "./fluxo"

// ── Progresso salvo ("no servidor") ─────────────────────────────────────────
// Na prévia, o armazenamento local faz o papel da tabela de progresso: fechar
// e reabrir o app volta para a mesma etapa, como vai acontecer de verdade.
const CHAVE_DO_PROGRESSO = "bivaque-previa-f01-progresso"

export function lerProgresso(): Progresso {
  try {
    const bruto = window.localStorage.getItem(CHAVE_DO_PROGRESSO)
    if (bruto === null) return progressoInicial()
    const lido = JSON.parse(bruto) as Progresso
    return lido.versao === VERSAO_DO_FLUXO ? lido : progressoInicial()
  } catch {
    return progressoInicial()
  }
}

export function salvarProgresso(progresso: Progresso): void {
  try {
    window.localStorage.setItem(CHAVE_DO_PROGRESSO, JSON.stringify(progresso))
  } catch {
    // Sem armazenamento (aba privada): a prévia segue só em memória.
  }
}

export function apagarProgresso(): void {
  try {
    window.localStorage.removeItem(CHAVE_DO_PROGRESSO)
  } catch {
    // idem
  }
}

// ── Consulta do vínculo, assíncrona ─────────────────────────────────────────
export type Cenario = "confirma-rapido" | "confirma-devagar" | "nao-encontrado" | "portal-fora"

export const CENARIOS: readonly { id: Cenario; rotulo: string }[] = [
  { id: "confirma-rapido", rotulo: "Confirma em 4 s" },
  { id: "confirma-devagar", rotulo: "Confirma em 20 s" },
  { id: "nao-encontrado", rotulo: "Não encontrado" },
  { id: "portal-fora", rotulo: "Portal fora do ar" },
]

const DEMORA: Record<Cenario, number> = {
  "confirma-rapido": 4000,
  "confirma-devagar": 20000,
  "nao-encontrado": 6000,
  "portal-fora": 5000,
}

const RESULTADO: Record<Cenario, Verificacao> = {
  "confirma-rapido": "confirmada",
  "confirma-devagar": "confirmada",
  "nao-encontrado": "nao-encontrada",
  "portal-fora": "portal-fora",
}

/**
 * Começa a consulta e devolve o cancelamento. O servidor real responde na
 * hora com "consultando" (idempotente pela conta) e avisa o resultado depois.
 */
export function consultarVinculo(
  cenario: Cenario,
  aoTerminar: (resultado: Verificacao) => void,
): () => void {
  const espera = window.setTimeout(() => aoTerminar(RESULTADO[cenario]), DEMORA[cenario])
  return () => window.clearTimeout(espera)
}

// ── Funil: só etapa, ação e tempo; nenhum dado pessoal ──────────────────────
export type EventoDoFunil = {
  /** Número de ordem do evento na sessão. */
  seq: number
  acao: "vista" | "concluida" | "voltou" | "erro" | "pulou"
  etapa: IdDaEtapa
  versao: number
  via: Via | null
  /** Milissegundos desde que a etapa apareceu (só em "concluida"). */
  ms?: number
  /** Código fechado do motivo (só em "erro"), nunca texto livre. */
  motivo?: "codigo-invalido" | "cpf-invalido" | "email-invalido" | "documento-invalido"
}

const eventos: EventoDoFunil[] = []
const ouvintes = new Set<() => void>()

export function registrarEvento(evento: Omit<EventoDoFunil, "versao" | "seq">): void {
  eventos.push({ ...evento, versao: VERSAO_DO_FLUXO, seq: eventos.length + 1 })
  for (const ouvir of ouvintes) ouvir()
}

export function eventosDoFunil(): readonly EventoDoFunil[] {
  return eventos
}

export function ouvirFunil(ouvir: () => void): () => void {
  ouvintes.add(ouvir)
  return () => ouvintes.delete(ouvir)
}

// ── A cidade, em números agregados ──────────────────────────────────────────
export type Cidade = {
  nome: string
  uf: string
  membros: number
  grupos: number
  encontrosNoMes: number
  desapegos: number
  perguntasRespondidas: number
  destaque: { pergunta: string; respostas: number } | null
  encontro: { titulo: string; quando: string } | null
}

export const CIDADES: readonly Cidade[] = [
  {
    nome: "Manaus",
    uf: "AM",
    membros: 1340,
    grupos: 18,
    encontrosNoMes: 4,
    desapegos: 37,
    perguntasRespondidas: 212,
    destaque: { pergunta: "Pediatra que atende pelo FUSEx na Zona Centro-Sul?", respostas: 14 },
    encontro: { titulo: "Café de boas-vindas aos que chegaram", quando: "sáb., 8 nov · 9h" },
  },
  {
    nome: "Brasília",
    uf: "DF",
    membros: 4210,
    grupos: 41,
    encontrosNoMes: 9,
    desapegos: 168,
    perguntasRespondidas: 930,
    destaque: { pergunta: "Escola com vaga no meio do ano na Asa Sul?", respostas: 22 },
    encontro: { titulo: "Feira de troca de uniformes escolares", quando: "dom., 9 nov · 10h" },
  },
  {
    nome: "Santa Maria",
    uf: "RS",
    membros: 286,
    grupos: 7,
    encontrosNoMes: 2,
    desapegos: 19,
    perguntasRespondidas: 64,
    destaque: { pergunta: "Mudança de Manaus para cá: transportadora confiável?", respostas: 6 },
    encontro: null,
  },
  {
    nome: "São Gabriel da Cachoeira",
    uf: "AM",
    membros: 7,
    grupos: 1,
    encontrosNoMes: 0,
    desapegos: 2,
    perguntasRespondidas: 3,
    destaque: null,
    encontro: null,
  },
]

export function cidadePorNome(nome: string | null): Cidade | null {
  return CIDADES.find((cidade) => cidade.nome === nome) ?? null
}

// ── Interesses e grupos ─────────────────────────────────────────────────────
export const INTERESSES: readonly string[] = [
  "Escola e creche",
  "Saúde",
  "Mudança",
  "Imóveis",
  "Desapegos",
  "Pets",
  "Esporte",
  "Cônjuges",
  "Filhos pequenos",
  "Trabalho e renda",
  "Passeios",
  "Serviços da casa",
]

export type GrupoSugerido = {
  id: string
  nome: string
  membros: number
  foto: string
  /** Interesses que puxam o grupo; vazio = vale para todos. */
  interesses: readonly string[]
  /** Momento que puxa o grupo; ausente = qualquer. */
  momento?: "chegando" | "morando" | "saindo"
}

export const GRUPOS: readonly GrupoSugerido[] = [
  {
    id: "chegadas",
    nome: "Chegadas 2026",
    membros: 184,
    foto: "demo/chegada.webp",
    interesses: [],
    momento: "chegando",
  },
  {
    id: "escolas",
    nome: "Escolas e creches",
    membros: 412,
    foto: "demo/classroom.jpg",
    interesses: ["Escola e creche", "Filhos pequenos"],
  },
  {
    id: "saude",
    nome: "Saúde e FUSEx",
    membros: 530,
    foto: "demo/dentist.jpg",
    interesses: ["Saúde"],
  },
  {
    id: "mudancas",
    nome: "Mudança e transporte",
    membros: 266,
    foto: "demo/moving.jpg",
    interesses: ["Mudança"],
  },
  { id: "pets", nome: "Pets da Vila", membros: 97, foto: "demo/pets.jpg", interesses: ["Pets"] },
  {
    id: "conjuges",
    nome: "Cônjuges em movimento",
    membros: 301,
    foto: "demo/friends.webp",
    interesses: ["Cônjuges", "Trabalho e renda"],
  },
  {
    id: "saindo",
    nome: "Saindo em 2027",
    membros: 58,
    foto: "demo/saindo.webp",
    interesses: [],
    momento: "saindo",
  },
  {
    id: "corrida",
    nome: "Corrida de sábado",
    membros: 73,
    foto: "demo/sunset.webp",
    interesses: ["Esporte", "Passeios"],
  },
]

/** Sugestões com o motivo de cada uma, na ordem: momento, interesses, populares. */
export function sugerirGrupos(
  interesses: readonly string[],
  momento: Progresso["momento"],
): readonly { grupo: GrupoSugerido; motivo: string }[] {
  const porMomento = GRUPOS.filter((g) => g.momento !== undefined && g.momento === momento).map(
    (grupo) => ({ grupo, motivo: "Para quem está no seu momento" }),
  )
  const porInteresse = GRUPOS.filter(
    (g) => g.momento === undefined && g.interesses.some((i) => interesses.includes(i)),
  ).map((grupo) => {
    const comum = grupo.interesses.find((i) => interesses.includes(i)) ?? ""
    return { grupo, motivo: `Porque você marcou ${comum}` }
  })
  const vistos = new Set([...porMomento, ...porInteresse].map((s) => s.grupo.id))
  const populares = GRUPOS.filter((g) => g.momento === undefined && !vistos.has(g.id))
    .sort((a, b) => b.membros - a.membros)
    .slice(0, Math.max(0, 4 - porInteresse.length))
    .map((grupo) => ({ grupo, motivo: "Popular na sua cidade" }))
  return [...porMomento, ...porInteresse, ...populares]
}
