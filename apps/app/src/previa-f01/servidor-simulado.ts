/**
 * O servidor da prévia do F01. Cada função aqui tem a forma da chamada real que
 * a substitui quando o dono aprovar o ADR e a prévia — nada daqui vai para o
 * banco. O CPF não passa por este módulo: a tela só entrega "consultar" e
 * recebe o resultado, como o servidor real fará.
 */
import type { NomeDoSelo } from "@/src/pecas/pecas"
import type { EventoDoFunil } from "./entrada-dados"
import { type Progresso, progressoInicial, VERSAO_DO_FLUXO, type Verificacao } from "./fluxo"

export type { EventoDoFunil } from "./entrada-dados"

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

// ── A cidade ────────────────────────────────────────────────────────────────
// `membros` só decide se a cidade já tem gente o bastante para mostrar
// conteúdo (`MINIMO_PARA_EXIBIR`); o número não vai para a tela.
export type PerguntaDaCidade = {
  texto: string
  respostas: number
  /** Momento de quem costuma perguntar; ausente = qualquer. */
  momento?: "chegando" | "morando" | "saindo"
}

export type Cidade = {
  nome: string
  uf: string
  membros: number
  perguntas: readonly PerguntaDaCidade[]
  encontro: { titulo: string; quando: string } | null
}

export const CIDADES: readonly Cidade[] = [
  {
    nome: "Manaus",
    uf: "AM",
    membros: 1340,
    perguntas: [
      {
        texto: "Pediatra que atende pelo FUSEx na Zona Centro-Sul?",
        respostas: 14,
        momento: "chegando",
      },
      {
        texto: "Bairro tranquilo, com escola perto, para quem tem filho pequeno?",
        respostas: 9,
        momento: "chegando",
      },
      {
        texto: "Vale trazer o carro de Brasília ou vender e comprar aqui?",
        respostas: 11,
        momento: "chegando",
      },
      {
        texto: "Alguém indica eletricista de confiança no Dom Pedro?",
        respostas: 7,
        momento: "morando",
      },
      {
        texto: "Onde fazer churrasco com a família no fim de semana?",
        respostas: 12,
        momento: "morando",
      },
      {
        texto: "Transportadora confiável para mudança para o Sul?",
        respostas: 6,
        momento: "saindo",
      },
    ],
    encontro: { titulo: "Café de boas-vindas para quem chegou", quando: "sáb., 8 de nov., 9h" },
  },
  {
    nome: "Brasília",
    uf: "DF",
    membros: 4210,
    perguntas: [
      { texto: "Escola com vaga no meio do ano na Asa Sul?", respostas: 22, momento: "chegando" },
      {
        texto: "Apartamento funcional ou aluguel: o que compensa?",
        respostas: 31,
        momento: "chegando",
      },
      { texto: "Feira boa de domingo no Sudoeste?", respostas: 8, momento: "morando" },
    ],
    encontro: { titulo: "Feira de troca de uniformes escolares", quando: "dom., 9 de nov., 10h" },
  },
  {
    nome: "Santa Maria",
    uf: "RS",
    membros: 286,
    perguntas: [
      {
        texto: "Vindo de Manaus: que roupa de frio comprar aqui e não lá?",
        respostas: 6,
        momento: "chegando",
      },
    ],
    encontro: null,
  },
  {
    nome: "São Gabriel da Cachoeira",
    uf: "AM",
    membros: 7,
    perguntas: [],
    encontro: null,
  },
]

/** As perguntas que importam para o momento da pessoa, até três. */
export function perguntasDoMomento(
  cidade: Cidade,
  momento: Progresso["momento"],
): readonly PerguntaDaCidade[] {
  const doMomento = cidade.perguntas.filter((p) => p.momento === momento)
  const outras = cidade.perguntas.filter((p) => p.momento !== momento)
  return [...doMomento, ...outras].slice(0, 3)
}

export function cidadePorNome(nome: string | null): Cidade | null {
  return CIDADES.find((cidade) => cidade.nome === nome) ?? null
}

// ── Interesses e grupos ─────────────────────────────────────────────────────
export type GrupoSugerido = {
  id: string
  nome: string
  membros: number
  /** Selo da família de ilustrações; o grupo ainda não tem capa enviada. */
  selo: NomeDoSelo
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
    selo: "chegadas",
    interesses: [],
    momento: "chegando",
  },
  {
    id: "escolas",
    nome: "Escolas e creches",
    membros: 412,
    selo: "escolas",
    interesses: ["Escola e creche", "Filhos pequenos"],
  },
  {
    id: "saude",
    nome: "Saúde e FUSEx",
    membros: 530,
    selo: "saude",
    interesses: ["Saúde"],
  },
  {
    id: "mudancas",
    nome: "Mudança e transporte",
    membros: 266,
    selo: "mudancas",
    interesses: ["Mudança"],
  },
  { id: "pets", nome: "Pets da Vila", membros: 97, selo: "pets", interesses: ["Pets"] },
  {
    id: "conjuges",
    nome: "Cônjuges em movimento",
    membros: 301,
    selo: "conjuges",
    interesses: ["Cônjuges", "Trabalho e renda"],
  },
  {
    id: "saindo",
    nome: "Saindo em 2027",
    membros: 58,
    selo: "saindo",
    interesses: [],
    momento: "saindo",
  },
  {
    id: "corrida",
    nome: "Corrida de sábado",
    membros: 73,
    selo: "corrida",
    interesses: ["Esporte", "Passeios"],
  },
]

const MOTIVO_DO_MOMENTO: Record<"chegando" | "morando" | "saindo", string> = {
  chegando: "Para quem está chegando",
  morando: "Para quem mora aqui",
  saindo: "Para quem está de mudança",
}

/** Sugestões com o motivo de cada uma, na ordem: momento, interesses, populares. */
export function sugerirGrupos(
  interesses: readonly string[],
  momento: Progresso["momento"],
): readonly { grupo: GrupoSugerido; motivo: string }[] {
  const porMomento = GRUPOS.filter((g) => g.momento !== undefined && g.momento === momento).map(
    (grupo) => ({ grupo, motivo: MOTIVO_DO_MOMENTO[grupo.momento ?? "morando"] }),
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
