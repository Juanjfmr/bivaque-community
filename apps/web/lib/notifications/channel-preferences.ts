// RECON-031 — the single delivery rule for notification preferences.
//
// ADR-20260909-canais-de-notificacao D1/D4: the preference is a type × channel
// matrix read in one place per delivery path. The outbox dispatcher calls this
// module; it never re-implements the rule, and no producer reads the matrix.
//
// The database holds the same rule in `private.notification_channel_allows`
// (migration 20260911054812). Keeping the TypeScript twin pure lets the
// dispatcher be tested with the channel on and off without a database.

export type NotificationChannel = "in_app" | "email"

export type NotificationTypeKey = "comments" | "events" | "mentions" | "messages" | "product_news"

export const NOTIFICATION_TYPE_KEYS: readonly NotificationTypeKey[] = [
  "comments",
  "events",
  "mentions",
  "messages",
  "product_news",
]

export const NOTIFICATION_CHANNELS: readonly NotificationChannel[] = ["in_app", "email"]

// The outbox writes a notification type; the matrix stores a preference key.
const OUTBOX_TYPE_TO_PREFERENCE_KEY: Record<string, NotificationTypeKey> = {
  comment: "comments",
  event_rsvp: "events",
  event_change: "events",
  event_reminder: "events",
  // event_invite tem que estar aqui. Ja saiu duas vezes: o filtro devolve
  // `true` para tipo nao mapeado, entao a ausencia nao quebra nada — ela
  // entrega convite de evento a quem desligou eventos, em silencio.
  event_invite: "events",
  direct_message: "messages",
  product_news: "product_news",
}

// Only the outbox `email` channel maps to a user-facing matrix channel.
// `whatsapp` is not offered as a control, so it stays governed by the type
// alone (plus the opt-out list, handled separately by the dispatcher).
const OUTBOX_CHANNEL_TO_MATRIX_CHANNEL: Record<string, NotificationChannel | null> = {
  email: "email",
  whatsapp: null,
}

export interface TypePreferenceRow {
  comments: boolean
  events: boolean
  messages: boolean
  mentions: boolean
  product_news: boolean
}

export interface ChannelPreferenceRow {
  notification_type: string
  channel: NotificationChannel
  enabled: boolean
}

export function preferenceKeyForOutboxType(type: string): NotificationTypeKey | null {
  return OUTBOX_TYPE_TO_PREFERENCE_KEY[type] ?? null
}

// A missing preference row keeps the historical default: receive — except
// product_news, which is opt-in (ADR D3).
function typeEnabled(key: NotificationTypeKey, preference: TypePreferenceRow | undefined): boolean {
  if (!preference) return key !== "product_news"
  const value = preference[key]
  return typeof value === "boolean" ? value : key !== "product_news"
}

export function notificationChannelAllows(input: {
  type: string
  channel: NotificationChannel
  preference: TypePreferenceRow | undefined
  matrix: readonly ChannelPreferenceRow[]
}): boolean {
  const key = preferenceKeyForOutboxType(input.type)
  if (key === null) return true
  if (!typeEnabled(key, input.preference)) return false

  const row = input.matrix.find(
    (entry) => entry.notification_type === key && entry.channel === input.channel,
  )
  return row ? row.enabled : true
}

export function outboxDeliveryAllowed(input: {
  type: string
  outboxChannel: string
  preference: TypePreferenceRow | undefined
  matrix: readonly ChannelPreferenceRow[]
}): boolean {
  const matrixChannel = OUTBOX_CHANNEL_TO_MATRIX_CHANNEL[input.outboxChannel]
  if (matrixChannel === null || matrixChannel === undefined) {
    const key = preferenceKeyForOutboxType(input.type)
    if (key === null) return true
    return typeEnabled(key, input.preference)
  }
  return notificationChannelAllows({
    type: input.type,
    channel: matrixChannel,
    preference: input.preference,
    matrix: input.matrix,
  })
}
