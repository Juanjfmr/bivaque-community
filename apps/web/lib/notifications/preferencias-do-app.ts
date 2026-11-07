import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

/**
 * As preferências de aviso que o app lê e grava (F09).
 *
 * O formato é o que a web antiga já usa: quatro tipos visíveis e a matriz
 * tipo × canal de `notification_channel_preferences`. A regra de entrega fica
 * onde sempre esteve (`private.notification_channel_allows` e
 * `lib/notifications/channel-preferences`); este módulo só persistência e
 * leitura.
 *
 * `push` é o terceiro canal, decidido pelo dono em 04/11/2026. Ele é gravado
 * como preferência, mas quem entrega push é o LAN-PUSH (depende das chaves da
 * loja): a tela diz isso com palavras, não finge que o aviso já chega.
 */

export const TIPOS_DO_AVISO = ["comments", "events", "product_news", "indications"] as const
export const CANAIS_DO_AVISO = ["in_app", "email", "push"] as const

export type TipoDoAviso = (typeof TIPOS_DO_AVISO)[number]
export type CanalDoAviso = (typeof CANAIS_DO_AVISO)[number]

export type CanalDaPreferencia = Readonly<{
  notificationType: TipoDoAviso
  channel: CanalDoAviso
  enabled: boolean
}>

export type PreferenciasDoAviso = Readonly<{
  comments: boolean
  events: boolean
  productNews: boolean
  indications: boolean
  channels: readonly CanalDaPreferencia[]
}>

type Cliente = SupabaseClient<Database>

function ehTipo(valor: unknown): valor is TipoDoAviso {
  return typeof valor === "string" && (TIPOS_DO_AVISO as readonly string[]).includes(valor)
}

function ehCanal(valor: unknown): valor is CanalDoAviso {
  return typeof valor === "string" && (CANAIS_DO_AVISO as readonly string[]).includes(valor)
}

/**
 * Sem linha na matriz o canal segue o tipo — exceto o e-mail das indicações,
 * que é o resumo diário e nasce desligado, e o push, que nasce desligado
 * porque ainda não há envio (LAN-PUSH). Canal ligado que não entrega é a tela
 * que mente; a escolha fica gravada para quando o envio existir.
 */
function canalPadrao(
  tipoHabilitado: boolean,
  notificationType: TipoDoAviso,
  channel: CanalDoAviso,
): boolean {
  if (channel === "push") return false
  if (notificationType === "indications" && channel === "email") return false
  return tipoHabilitado
}

export async function lerPreferencias(
  client: Cliente,
  userId: string,
): Promise<PreferenciasDoAviso> {
  const [preferencia, matriz] = await Promise.all([
    client
      .from("notification_preferences")
      .select("comments, events, product_news, indications")
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("notification_channel_preferences")
      .select("notification_type, channel, enabled")
      .eq("user_id", userId),
  ])
  if (preferencia.error) throw preferencia.error
  if (matriz.error) throw matriz.error

  const linha = preferencia.data
  const comments = linha?.comments ?? true
  const events = linha?.events ?? true
  const productNews = linha?.product_news ?? false
  const indications = linha?.indications ?? true
  const tipoHabilitado: Record<TipoDoAviso, boolean> = {
    comments,
    events,
    product_news: productNews,
    indications,
  }

  const guardado = new Map(
    (matriz.data ?? []).map((item) => [`${item.notification_type}:${item.channel}`, item.enabled]),
  )
  const channels: CanalDaPreferencia[] = []
  for (const notificationType of TIPOS_DO_AVISO) {
    for (const channel of CANAIS_DO_AVISO) {
      channels.push({
        notificationType,
        channel,
        enabled:
          guardado.get(`${notificationType}:${channel}`) ??
          canalPadrao(tipoHabilitado[notificationType], notificationType, channel),
      })
    }
  }

  return { comments, events, productNews, indications, channels }
}

export type AtualizacaoDePreferencias = Readonly<{
  comments: boolean
  events: boolean
  productNews: boolean
  indications: boolean
  channels: readonly CanalDaPreferencia[] | null
}>

/** Corpo do PATCH, ou `null` quando não é o que esta rota aceita. */
export function validarAtualizacao(
  corpo: Record<string, unknown>,
): AtualizacaoDePreferencias | null {
  const comments = corpo["comments"]
  const events = corpo["events"]
  const productNews = corpo["productNews"]
  const indications = corpo["indications"]
  if (
    typeof comments !== "boolean" ||
    typeof events !== "boolean" ||
    typeof productNews !== "boolean" ||
    typeof indications !== "boolean"
  ) {
    return null
  }

  const brutos = corpo["channels"]
  if (brutos === undefined) {
    return { comments, events, productNews, indications, channels: null }
  }
  if (!Array.isArray(brutos)) return null

  const vistos = new Set<string>()
  const channels: CanalDaPreferencia[] = []
  for (const bruto of brutos) {
    if (bruto === null || typeof bruto !== "object" || Array.isArray(bruto)) return null
    const item = bruto as Record<string, unknown>
    const notificationType = item["notificationType"]
    const channel = item["channel"]
    const enabled = item["enabled"]
    if (!ehTipo(notificationType) || !ehCanal(channel) || typeof enabled !== "boolean") return null
    const chave = `${notificationType}:${channel}`
    // Repetir o mesmo par não é erro; vale a última leitura, como a tela manda.
    if (vistos.has(chave)) return null
    vistos.add(chave)
    channels.push({ notificationType, channel, enabled })
  }
  return { comments, events, productNews, indications, channels }
}

export async function salvarPreferencias(
  client: Cliente,
  userId: string,
  atualizacao: AtualizacaoDePreferencias,
): Promise<void> {
  const agora = new Date().toISOString()
  const { error: erroDaPreferencia } = await client.from("notification_preferences").upsert({
    user_id: userId,
    comments: atualizacao.comments,
    events: atualizacao.events,
    product_news: atualizacao.productNews,
    indications: atualizacao.indications,
    updated_at: agora,
  })
  if (erroDaPreferencia) throw erroDaPreferencia

  if (atualizacao.channels === null || atualizacao.channels.length === 0) return

  // Tipo desligado entrega por canal nenhum; a linha do canal acompanha o tipo.
  const tipoHabilitado: Record<TipoDoAviso, boolean> = {
    comments: atualizacao.comments,
    events: atualizacao.events,
    product_news: atualizacao.productNews,
    indications: atualizacao.indications,
  }
  const linhas = atualizacao.channels.map((item) => ({
    user_id: userId,
    notification_type: item.notificationType,
    channel: item.channel,
    enabled:
      item.notificationType === "product_news"
        ? item.enabled
        : tipoHabilitado[item.notificationType] && item.enabled,
    updated_at: agora,
  }))
  const { error: erroDaMatriz } = await client
    .from("notification_channel_preferences")
    .upsert(linhas)
  if (erroDaMatriz) throw erroDaMatriz
}
