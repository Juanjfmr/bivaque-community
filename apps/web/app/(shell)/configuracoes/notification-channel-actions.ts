"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import type {
  NotificationChannel,
  NotificationTypeKey,
} from "../../../lib/notifications/channel-preferences"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

// RECON-031: leitura e gravação da preferência por tipo e por canal. A regra de
// entrega vive em `lib/notifications/channel-preferences` (e no gêmeo SQL
// `private.notification_channel_allows`); estas actions só persistem o que a
// pessoa escolheu. Nenhum produtor de notificação é chamado daqui.

export interface ChannelPreference {
  notificationType: NotificationTypeKey
  channel: NotificationChannel
  enabled: boolean
}

export interface NotificationChannelState {
  comments: boolean
  events: boolean
  productNews: boolean
  indications: boolean
  channels: ChannelPreference[]
}

const TYPE_KEYS: readonly NotificationTypeKey[] = [
  "comments",
  "events",
  "product_news",
  "indications",
]
const CHANNELS: readonly NotificationChannel[] = ["in_app", "email"]

async function readSessionUserId(): Promise<string | null> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }
  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
  const {
    data: { user },
  } = await authClient.auth.getUser()
  return user?.id ?? null
}

// Missing matrix row keeps the type state (deliver when the type is on). This
// mirrors `private.notification_channel_allows` so the screen never shows a
// channel that the dispatcher would ignore.
// The e-mail of indications is the daily digest, and it is opt-in.
function defaultChannelEnabled(
  typeEnabled: boolean,
  notificationType: NotificationTypeKey,
  channel: NotificationChannel,
): boolean {
  if (notificationType === "indications" && channel === "email") return false
  return typeEnabled
}

export async function getNotificationChannelStateAction(): Promise<NotificationChannelState | null> {
  const userId = await readSessionUserId()
  if (!userId) return null

  const supabase = createServiceClient()
  const [preferenceResult, matrixResult] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select("comments, events, product_news, indications")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("notification_channel_preferences")
      .select("notification_type, channel, enabled")
      .eq("user_id", userId),
  ])

  if (preferenceResult.error) throw new Error(preferenceResult.error.message)
  if (matrixResult.error) throw new Error(matrixResult.error.message)

  const preference = preferenceResult.data
  const comments = preference?.comments ?? true
  const events = preference?.events ?? true
  const productNews = preference?.product_news ?? false
  const indications = preference?.indications ?? true
  const typeEnabled: Record<NotificationTypeKey, boolean> = {
    comments,
    events,
    product_news: productNews,
    indications,
    mentions: true,
    messages: true,
  }

  const stored = new Map(
    (matrixResult.data ?? []).map((row) => [
      `${row.notification_type}:${row.channel}`,
      row.enabled as boolean,
    ]),
  )

  const channels: ChannelPreference[] = []
  for (const notificationType of TYPE_KEYS) {
    for (const channel of CHANNELS) {
      const key = `${notificationType}:${channel}`
      const enabled = stored.has(key)
        ? (stored.get(key) as boolean)
        : defaultChannelEnabled(typeEnabled[notificationType], notificationType, channel)
      channels.push({ notificationType, channel, enabled })
    }
  }

  return { comments, events, productNews, indications, channels }
}

export async function updateNotificationChannelStateAction(formData: FormData) {
  const userId = await readSessionUserId()
  if (!userId) throw new Error("não autenticado")

  const comments = formData.get("comments") === "on"
  const events = formData.get("events") === "on"
  const productNews = formData.get("productNews") === "on"
  const indications = formData.get("indications") === "on"

  const channelValue = (name: string): boolean => formData.get(name) === "on"

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  const { error: preferenceError } = await supabase.from("notification_preferences").upsert({
    user_id: userId,
    comments,
    events,
    product_news: productNews,
    indications,
    updated_at: now,
  })
  if (preferenceError) throw new Error(preferenceError.message)

  // A type that is off delivers by no channel, so its channel rows are written
  // false; turning the type back on re-opens the channels the person checks.
  const baseRows: Array<{
    notification_type: string
    channel: "in_app" | "email"
    enabled: boolean
  }> = [
    {
      notification_type: "comments",
      channel: "in_app",
      enabled: comments && channelValue("commentsInApp"),
    },
    {
      notification_type: "comments",
      channel: "email",
      enabled: comments && channelValue("commentsEmail"),
    },
    {
      notification_type: "events",
      channel: "in_app",
      enabled: events && channelValue("eventsInApp"),
    },
    {
      notification_type: "events",
      channel: "email",
      enabled: events && channelValue("eventsEmail"),
    },
    { notification_type: "product_news", channel: "in_app", enabled: productNews },
    { notification_type: "product_news", channel: "email", enabled: productNews },
    {
      notification_type: "indications",
      channel: "in_app",
      enabled: indications && channelValue("indicationsInApp"),
    },
    {
      notification_type: "indications",
      channel: "email",
      enabled: indications && channelValue("indicationsEmail"),
    },
  ]
  const rows = baseRows.map((row) => ({ ...row, user_id: userId, updated_at: now }))

  const { error: matrixError } = await supabase
    .from("notification_channel_preferences")
    .upsert(rows)
  if (matrixError) throw new Error(matrixError.message)

  revalidatePath("/configuracoes/notificacoes")
}
