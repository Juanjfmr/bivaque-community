import {
  FLUXO_F01,
  type IdDaEtapa,
  type Momento,
  type Progresso,
  progressoInicial,
  VERSAO_DO_FLUXO,
  type Verificacao,
} from "@/src/previa-f01/fluxo"

/**
 * Tradução entre o progresso do fluxo (`Progresso`) e o rascunho do servidor
 * (ADR-20261102-progresso-da-entrada). Funções puras, testadas sem rede.
 *
 * O servidor guarda só o que ainda não está no banco canônico e o formato é
 * fechado. Por isso:
 *
 * - o que volta do servidor é **defensivamente validado** (o app não confia na
 *   forma por ter sido ele a gravar; uma linha antiga pode vir de outra versão);
 * - o que vai para o servidor é **filtrado**: e-mail mascarado, via, verificação
 *   e CPF nunca entram no rascunho. A verificação vem da rota própria e o CPF
 *   nunca é persistido.
 */

const ETAPAS: readonly IdDaEtapa[] = FLUXO_F01.map((etapa) => etapa.id)

const MOMENTOS: readonly string[] = ["chegando", "morando", "saindo"]
const AVISOS: readonly string[] = ["ativados", "agora-nao"]

export type EstadoDoServidor = Readonly<{
  nome?: Readonly<{ nome: string; sobrenome: string }>
  cidade?: string
  cidadeIbge?: string
  destinoIbge?: string
  dataChegada?: string
  dataSaida?: string
  momento?: Momento
  interesses?: readonly string[]
  grupos?: readonly string[]
  avisos?: "ativados" | "agora-nao"
  convite?: boolean
}>

// Modelo canônico da entrada: cidade e destino em código IBGE, data em
// `YYYY-MM-DD` de calendário real. O estado que volta do servidor passa por aqui
// de novo (defesa contra linha antiga), então a regra não pode divergir.
const CODIGO_IBGE = /^\d{7}$/
const DATA_ISO = /^(\d{4})-(\d{2})-(\d{2})$/

function codigoIbge(valor: unknown): string | undefined {
  return typeof valor === "string" && CODIGO_IBGE.test(valor) ? valor : undefined
}

function dataIso(valor: unknown): string | undefined {
  if (typeof valor !== "string") return undefined
  const achado = DATA_ISO.exec(valor)
  if (achado === null) return undefined
  const [ano, mes, dia] = [Number(achado[1]), Number(achado[2]), Number(achado[3])]
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  return data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
    ? valor
    : undefined
}

function etapaValida(valor: unknown): IdDaEtapa | null {
  return typeof valor === "string" && (ETAPAS as readonly string[]).includes(valor)
    ? (valor as IdDaEtapa)
    : null
}

function nomes(valor: unknown): { nome: string; sobrenome: string } | undefined {
  if (typeof valor !== "object" || valor === null) return undefined
  const dados = valor as Record<string, unknown>
  if (typeof dados["nome"] !== "string" || typeof dados["sobrenome"] !== "string") return undefined
  return { nome: dados["nome"], sobrenome: dados["sobrenome"] }
}

function lista(valor: unknown): string[] | undefined {
  if (!Array.isArray(valor)) return undefined
  return valor.filter((item): item is string => typeof item === "string")
}

/** Valida o estado do servidor, descartando o que não tem a forma conhecida. */
export function estadoDoServidor(valor: unknown): EstadoDoServidor {
  if (typeof valor !== "object" || valor === null) return {}
  const dados = valor as Record<string, unknown>
  const estado: {
    nome?: { nome: string; sobrenome: string }
    cidade?: string
    cidadeIbge?: string
    destinoIbge?: string
    dataChegada?: string
    dataSaida?: string
    momento?: Momento
    interesses?: string[]
    grupos?: string[]
    avisos?: "ativados" | "agora-nao"
    convite?: boolean
  } = {}

  const nome = nomes(dados["nome"])
  if (nome !== undefined) estado.nome = nome
  if (typeof dados["cidade"] === "string") estado.cidade = dados["cidade"]
  const cidadeIbge = codigoIbge(dados["cidadeIbge"])
  if (cidadeIbge !== undefined) estado.cidadeIbge = cidadeIbge
  const destinoIbge = codigoIbge(dados["destinoIbge"])
  if (destinoIbge !== undefined) estado.destinoIbge = destinoIbge
  const dataChegada = dataIso(dados["dataChegada"])
  if (dataChegada !== undefined) estado.dataChegada = dataChegada
  const dataSaida = dataIso(dados["dataSaida"])
  if (dataSaida !== undefined) estado.dataSaida = dataSaida
  if (typeof dados["momento"] === "string" && MOMENTOS.includes(dados["momento"])) {
    estado.momento = dados["momento"] as Momento
  }
  const interesses = lista(dados["interesses"])
  if (interesses !== undefined) estado.interesses = interesses
  const grupos = lista(dados["grupos"])
  if (grupos !== undefined) estado.grupos = grupos
  if (typeof dados["avisos"] === "string" && AVISOS.includes(dados["avisos"])) {
    estado.avisos = dados["avisos"] as "ativados" | "agora-nao"
  }
  if (typeof dados["convite"] === "boolean") estado.convite = dados["convite"]

  return estado
}

export type RespostaDeProgressoDoServidor = Readonly<{
  autenticado: boolean
  progresso?: unknown
}>

/**
 * Monta o `Progresso` do fluxo a partir do que o servidor devolveu.
 *
 * O que é de sessão (via), do aparelho (e-mail mascarado) e da consulta
 * (verificação) começa no valor inicial: quem preenche é a tela, com a rota
 * própria, não o rascunho.
 */
export function progressoDoServidor(resposta: RespostaDeProgressoDoServidor): Progresso {
  const inicial = progressoInicial()
  if (
    !resposta.autenticado ||
    typeof resposta.progresso !== "object" ||
    resposta.progresso === null
  ) {
    return inicial
  }
  const dados = resposta.progresso as Record<string, unknown>
  // ADR-20261102: rascunho de outra versão do fluxo não é migrado nem aproveitado
  // em parte — a pessoa recomeça da porta. O servidor já devolve o inicial; o app
  // não confia nisso (cache, resposta antiga) e confere a versão também.
  if (dados["versao"] !== VERSAO_DO_FLUXO) return inicial
  const etapa = etapaValida(dados["etapa"]) ?? "porta"
  return {
    ...inicial,
    versao: VERSAO_DO_FLUXO,
    etapa,
    ...estadoDoServidor(dados["estado"]),
  }
}

/** Só o que o rascunho guarda vai para o servidor; dado sensível fica de fora. */
export function estadoParaServidor(progresso: Progresso): EstadoDoServidor {
  return {
    ...(progresso.nome === null ? {} : { nome: progresso.nome }),
    ...(progresso.cidade === null ? {} : { cidade: progresso.cidade }),
    ...(progresso.cidadeIbge === null ? {} : { cidadeIbge: progresso.cidadeIbge }),
    ...(progresso.destinoIbge === null ? {} : { destinoIbge: progresso.destinoIbge }),
    ...(progresso.dataChegada === null ? {} : { dataChegada: progresso.dataChegada }),
    ...(progresso.dataSaida === null ? {} : { dataSaida: progresso.dataSaida }),
    ...(progresso.momento === null ? {} : { momento: progresso.momento }),
    ...(progresso.interesses.length === 0 ? {} : { interesses: progresso.interesses }),
    ...(progresso.grupos.length === 0 ? {} : { grupos: progresso.grupos }),
    ...(progresso.avisos === null ? {} : { avisos: progresso.avisos }),
    ...(progresso.convite ? { convite: true } : {}),
  }
}

export type RascunhoParaServidor = Readonly<{
  versao: number
  etapa: IdDaEtapa
  estado: EstadoDoServidor
}>

export function paraServidor(progresso: Progresso): RascunhoParaServidor {
  return {
    versao: progresso.versao,
    etapa: progresso.etapa,
    estado: estadoParaServidor(progresso),
  }
}

/**
 * O status cru da verificação vira o estado da máquina de etapas.
 * `pending` é "consultando" (o Portal está sendo consultado); `rejected` cai no
 * caminho do documento; `temporary_error` é o Portal fora do ar.
 */
export function verificacaoDoStatus(status: string | null): Verificacao {
  if (status === "verified") return "confirmada"
  if (status === "pending") return "consultando"
  if (status === "rejected") return "nao-encontrada"
  if (status === "temporary_error") return "portal-fora"
  return "nao-iniciada"
}
