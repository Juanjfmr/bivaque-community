import { enviar, FalhaDaApi, ler } from "../api/cliente"
import { ESTADOS_DA_ENTRADA } from "../navegacao/rotas"

/**
 * A porta dos avisos do app (F09), no molde das outras jornadas: fala só com
 * `/api/app/avisos` e traduz o corpo para o que a tela desenha.
 *
 * O destino chega como caminho `/app/...` porque é o servidor que conhece a
 * regra de cada tipo (inclusive a tela segura quando não há jornada). Aqui ele
 * é partido em rota + parâmetro, que é o que a navegação do app recebe.
 */

export type FiltroDeAvisos = "todas" | "nao-lidas"

export type AvisoRecebido = Readonly<{
  id: string
  /** A frase pronta do servidor ("comentou na sua publicação"). */
  texto: string
  /** Caminho `/app/...` da jornada correspondente. */
  destino: string
  lida: boolean
  criadaEm: string
  tipo: string
  /**
   * Chave opaca do grupo (mesmo tipo, ação e alvo). Marcar lido devolve a chave
   * e o servidor alcança o grupo inteiro.
   */
  grupo: string
  /** Quantos avisos entraram nesta linha. 1 = linha solteira. */
  total: number
}>

export type ListaDeAvisos = Readonly<{
  avisos: readonly AvisoRecebido[]
  /** Posição da próxima página, opaca. */
  proximo: string | null
  /** Não lidos do destinatário inteiro, não só desta página. */
  naoLidos: number
}>

export const TIPOS_DO_AVISO = ["comments", "events", "product_news", "indications"] as const
export const CANAIS_DO_AVISO = ["in_app", "email", "push"] as const

export type TipoDoAviso = (typeof TIPOS_DO_AVISO)[number]
export type CanalDoAviso = (typeof CANAIS_DO_AVISO)[number]

export type CanalDaPreferencia = Readonly<{
  notificationType: TipoDoAviso
  channel: CanalDoAviso
  enabled: boolean
}>

export type PreferenciasDeAviso = Readonly<{
  comments: boolean
  events: boolean
  productNews: boolean
  indications: boolean
  resumoCidade: "off" | "daily" | "weekly"
  channels: readonly CanalDaPreferencia[]
}>

/** O tipo do aviso no servidor e a chave da preferência não têm o mesmo nome. */
export type ChaveDaPreferencia = Exclude<keyof PreferenciasDeAviso, "channels" | "resumoCidade">

export function chaveDaPreferencia(tipo: TipoDoAviso): ChaveDaPreferencia {
  return tipo === "product_news" ? "productNews" : tipo
}

/** Liga ou desliga um tipo sem tocar nos canais escolhidos. */
export function comTipo(
  preferencias: PreferenciasDeAviso,
  tipo: TipoDoAviso,
  ativo: boolean,
): PreferenciasDeAviso {
  return { ...preferencias, [chaveDaPreferencia(tipo)]: ativo }
}

type Corpo = Record<string, unknown>
type Opcoes = { signal?: AbortSignal }

function foraDoContrato(): FalhaDaApi {
  return new FalhaDaApi("indisponivel", 0, null, "Resposta do servidor fora do contrato.")
}

function exigirRegistro(valor: unknown): Corpo {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) throw foraDoContrato()
  return valor as Corpo
}

function exigirTexto(corpo: Corpo, chave: string): string {
  const valor = corpo[chave]
  if (typeof valor !== "string" || valor === "") throw foraDoContrato()
  return valor
}

function exigirBooleano(corpo: Corpo, chave: string): boolean {
  const valor = corpo[chave]
  if (typeof valor !== "boolean") throw foraDoContrato()
  return valor
}

function exigirNumero(corpo: Corpo, chave: string): number {
  const valor = corpo[chave]
  if (typeof valor !== "number" || !Number.isFinite(valor)) throw foraDoContrato()
  return valor
}

function ehTipo(valor: unknown): valor is TipoDoAviso {
  return typeof valor === "string" && (TIPOS_DO_AVISO as readonly string[]).includes(valor)
}

function ehCanal(valor: unknown): valor is CanalDoAviso {
  return typeof valor === "string" && (CANAIS_DO_AVISO as readonly string[]).includes(valor)
}

function lerAviso(valor: unknown): AvisoRecebido {
  const aviso = exigirRegistro(valor)
  return {
    id: exigirTexto(aviso, "id"),
    texto: exigirTexto(aviso, "texto"),
    destino: exigirTexto(aviso, "destino"),
    lida: exigirBooleano(aviso, "lida"),
    criadaEm: exigirTexto(aviso, "criadaEm"),
    tipo: exigirTexto(aviso, "tipo"),
    grupo: exigirTexto(aviso, "grupo"),
    total: exigirNumero(aviso, "total"),
  }
}

function lerPreferenciasDoCorpo(corpo: Corpo): PreferenciasDeAviso {
  const preferencias = exigirRegistro(corpo["preferencias"])
  const canais = preferencias["channels"]
  const resumoCidade = preferencias["resumoCidade"]
  if (resumoCidade !== "off" && resumoCidade !== "daily" && resumoCidade !== "weekly")
    throw foraDoContrato()
  if (!Array.isArray(canais)) throw foraDoContrato()
  return {
    comments: exigirBooleano(preferencias, "comments"),
    events: exigirBooleano(preferencias, "events"),
    productNews: exigirBooleano(preferencias, "productNews"),
    indications: exigirBooleano(preferencias, "indications"),
    resumoCidade,
    channels: canais.map((valor) => {
      const canal = exigirRegistro(valor)
      const notificationType = canal["notificationType"]
      const channel = canal["channel"]
      if (!ehTipo(notificationType) || !ehCanal(channel)) throw foraDoContrato()
      return {
        notificationType,
        channel,
        enabled: exigirBooleano(canal, "enabled"),
      }
    }),
  }
}

/** Os avisos da pessoa, paginados no servidor. */
export async function lerAvisos(
  opcoes: Opcoes & { filtro?: FiltroDeAvisos; depois?: string; limite?: string } = {},
): Promise<ListaDeAvisos> {
  const parametros = new URLSearchParams({ filtro: opcoes.filtro ?? "todas" })
  if (opcoes.depois !== undefined) parametros.set("depois", opcoes.depois)
  if (opcoes.limite !== undefined) parametros.set("limite", opcoes.limite)
  const corpo = await ler(`/api/app/avisos?${parametros.toString()}`, opcoes)
  const lista = corpo["avisos"]
  if (!Array.isArray(lista)) throw foraDoContrato()
  return {
    avisos: lista.map(lerAviso),
    proximo: corpo["proximo"] === null ? null : exigirTexto(corpo, "proximo"),
    naoLidos: exigirNumero(corpo, "naoLidos"),
  }
}

/** Marca um aviso como lido. Devolve quantos foram gravados (0 = já estava). */
export async function marcarLido(id: string, opcoes: Opcoes = {}): Promise<number> {
  const corpo = await enviar("POST", "/api/app/avisos/lidos", { id }, opcoes)
  return exigirNumero(corpo, "atualizados")
}

/** Marca o grupo inteiro como lido. Devolve quantos avisos o grupo tinha. */
export async function marcarGrupoLido(grupo: string, opcoes: Opcoes = {}): Promise<number> {
  const corpo = await enviar("POST", "/api/app/avisos/lidos", { grupo }, opcoes)
  return exigirNumero(corpo, "atualizados")
}

export async function marcarTodosLidos(opcoes: Opcoes = {}): Promise<number> {
  const corpo = await enviar("POST", "/api/app/avisos/lidos", { todos: true }, opcoes)
  return exigirNumero(corpo, "atualizados")
}

export async function lerPreferenciasDeAviso(opcoes: Opcoes = {}): Promise<PreferenciasDeAviso> {
  return lerPreferenciasDoCorpo(await ler("/api/app/avisos/preferencias", opcoes))
}

/** Grava a escolha e devolve o que ficou no servidor, não o que foi enviado. */
export async function salvarPreferenciasDeAviso(
  preferencias: Omit<PreferenciasDeAviso, "channels"> & {
    channels: readonly CanalDaPreferencia[]
  },
  opcoes: Opcoes = {},
): Promise<PreferenciasDeAviso> {
  return lerPreferenciasDoCorpo(
    await enviar("PATCH", "/api/app/avisos/preferencias", preferencias, opcoes),
  )
}

/** Rotas que o app tem, e a chave do parâmetro que o destino entrega para cada uma. */
const ROTAS_DE_DESTINO = new Map<string, "id" | "estado" | undefined>([
  ["publicacao", "id"],
  ["grupo", "id"],
  ["evento", "id"],
  ["conversa", "id"],
  ["pergunta", "id"],
  ["pedido", "id"],
  ["anuncio", "id"],
  // A situação da entrada é rota real do app: `/app/entrar/<estado>`, estado validado.
  ["entrar", "estado"],
  ["comunidade", undefined],
  ["chamados", undefined],
  ["voce", undefined],
])

export type DestinoNoApp = Readonly<{
  nome: string
  parametros: Readonly<Record<string, string>> | undefined
}>

/**
 * `/app/publicacao/<id>` vira `{ nome: "publicacao", parametros: { id } }`;
 * `/app/entrar/analise` vira `{ nome: "entrar", parametros: { estado: "analise" } }`.
 * Fora do contrato, `null` — quem chama decide a tela segura. Nunca se navega
 * para endereço inventado.
 */
export function destinoEmRota(destino: string): DestinoNoApp | null {
  const partes = /^\/app\/([a-z-]+)(?:\/([^/?#]+))?$/.exec(destino)
  if (partes === null) return null
  const nome = partes[1]
  const valor = partes[2]
  if (nome === undefined || !ROTAS_DE_DESTINO.has(nome)) return null
  const chave = ROTAS_DE_DESTINO.get(nome)
  if (chave === undefined || valor === undefined) return { nome, parametros: undefined }
  const parametro = decodeURIComponent(valor)
  if (chave === "estado" && !(ESTADOS_DA_ENTRADA as readonly string[]).includes(parametro)) {
    return null
  }
  return { nome, parametros: { [chave]: parametro } }
}
