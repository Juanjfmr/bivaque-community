import { timingSafeEqual } from "node:crypto"
import {
  deliverOutboxBatch,
  type OutboxChannel,
  type OutboxMessage,
  type OutboxMutation,
  scrubPii,
} from "@bivaque/domain"
import { NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import { log } from "../../../../lib/logger"
import {
  type ChannelPreferenceRow,
  outboxDeliveryAllowed,
} from "../../../../lib/notifications/channel-preferences"
import { createChannelAdapters } from "../../../../lib/outbox/adapters"
import { createServerClient } from "../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_BATCH = 100

// Teto de segurança do lote total. `private.outbox_prepare_due()` entrega
// todos os IDs vencidos no mesmo minuto, sem limite; 5.000 cobre uma fila bem
// acima do volume normal e ainda impede que um payload arbitrário abra
// milhares de consultas numa única requisição. O processamento é fatiado em
// blocos de MAX_BATCH — rejeitar o lote inteiro travava a fila para sempre
// (SEC-005 H4), porque o SQL já havia avançado `updated_at` dos itens.
const MAX_TOTAL_BATCH = 5_000

type BatchCounts = {
  processed: number
  sent: number
  skipped: number
  failed: number
  pending: number
}

type OutboxRow = Database["public"]["Tables"]["outbox"]["Row"]
type NotificationPreferencesRow = Pick<
  Database["public"]["Tables"]["notification_preferences"]["Row"],
  "user_id" | "comments" | "events" | "messages" | "mentions" | "product_news"
>
type NotificationChannelPreferencesRow =
  Database["public"]["Tables"]["notification_channel_preferences"]["Row"]
type OutboxUpdate = Database["public"]["Tables"]["outbox"]["Update"]

function secretMatches(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  )
}

function toMessage(row: OutboxRow): OutboxMessage {
  return {
    id: row.id,
    recipient: row.recipient,
    channel: row.channel,
    type: row.type,
    payload: row.payload as Record<string, unknown>,
    attempts: row.attempts,
    updatedAt: Date.parse(row.updated_at),
  }
}

function userIdFromPayload(payload: Record<string, unknown>): string | null {
  const raw = payload["user_id"]
  return typeof raw === "string" && raw.length > 0 ? raw : null
}

// A rejected query is as inconclusive as a returned database error.
async function deliveryLookup<T>(
  query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
) {
  try {
    return await query
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : "lookup rejected" },
    }
  }
}

export async function POST(request: Request) {
  const expectedSecret = process.env["OUTBOX_WORKER_SECRET"]
  if (!expectedSecret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 })
  }

  const providedSecret = request.headers.get("x-outbox-secret")
  if (!providedSecret || !secretMatches(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const rawIds = (body as { ids?: unknown }).ids
  if (!Array.isArray(rawIds)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const ids = [
    ...new Set(rawIds.filter((id): id is string => typeof id === "string" && id.length > 0)),
  ]
  if (ids.length === 0 || ids.length > MAX_TOTAL_BATCH) {
    return NextResponse.json({ error: "invalid_batch" }, { status: 400 })
  }

  const supabase = createServerClient()
  const now = Date.now()
  const totals: BatchCounts = { processed: 0, sent: 0, skipped: 0, failed: 0, pending: 0 }

  for (const chunk of chunksOf(ids, MAX_BATCH)) {
    const counts = await processBatch(chunk, supabase, now)
    if (counts === null) {
      return NextResponse.json({ error: "internal" }, { status: 500 })
    }
    totals.processed += counts.processed
    totals.sent += counts.sent
    totals.skipped += counts.skipped
    totals.failed += counts.failed
    totals.pending += counts.pending
  }

  log.info("outbox worker processed batch", totals)

  return NextResponse.json(totals)
}

function chunksOf<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

// Processa até MAX_BATCH IDs. Devolve null quando a consulta do lote falha,
// para o chamador responder 500 sem continuar com dados que não conseguiu ler.
async function processBatch(
  ids: string[],
  supabase: ReturnType<typeof createServerClient>,
  now: number,
): Promise<BatchCounts | null> {
  const { data: rows, error: selectError } = await supabase
    .from("outbox")
    .select("*")
    .in("id", ids)
    .eq("status", "pending")
    .limit(MAX_BATCH)

  if (selectError) {
    log.error("outbox worker select failed", { error: selectError.message, count: ids.length })
    return null
  }

  if (!rows || rows.length === 0) {
    return { processed: 0, sent: 0, skipped: 0, failed: 0, pending: 0 }
  }

  const messages = rows.map(toMessage)
  const userIds = [
    ...new Set(
      messages
        .map((message) => userIdFromPayload(message.payload))
        .filter((userId): userId is string => userId !== null),
    ),
  ]

  let preferences: NotificationPreferencesRow[] = []
  let channelPreferences: Array<
    Pick<NotificationChannelPreferencesRow, "user_id" | "notification_type" | "channel" | "enabled">
  > = []
  let preferenceLookupError: string | undefined
  if (userIds.length > 0) {
    const [preferencesResult, channelPreferencesResult] = await Promise.all([
      deliveryLookup(
        supabase
          .from("notification_preferences")
          .select("user_id, comments, events, messages, mentions, product_news, indications")
          .in("user_id", userIds),
      ),
      deliveryLookup(
        supabase
          .from("notification_channel_preferences")
          .select("user_id, notification_type, channel, enabled")
          .in("user_id", userIds),
      ),
    ])

    if (preferencesResult.error) {
      preferenceLookupError = "preference_lookup_failed"
      log.error("outbox worker preference lookup failed", {
        error: scrubPii(preferencesResult.error.message),
      })
    } else {
      preferences = preferencesResult.data ?? []
    }

    if (channelPreferencesResult.error) {
      preferenceLookupError = "channel_preference_lookup_failed"
      log.error("outbox worker channel-preference lookup failed", {
        error: scrubPii(channelPreferencesResult.error.message),
      })
    } else {
      channelPreferences = channelPreferencesResult.data ?? []
    }
  }

  const optOutResults = await Promise.all(
    messages.map((message) =>
      deliveryLookup(
        supabase
          .from("notification_opt_outs")
          .select("recipient")
          .eq("channel", message.channel)
          .eq("recipient", message.recipient)
          .maybeSingle(),
      ),
    ),
  )

  const lookupErrors = new Map<string, string>()
  for (const [index, message] of messages.entries()) {
    if (preferenceLookupError && userIdFromPayload(message.payload)) {
      lookupErrors.set(message.id, preferenceLookupError)
    }
    const result = optOutResults[index]
    if (result?.error) {
      lookupErrors.set(message.id, "opt_out_lookup_failed")
      log.error("outbox worker opt-out lookup failed", {
        error: scrubPii(result.error.message),
      })
    }
  }

  const preferencesByUser = new Map<string, NotificationPreferencesRow>(
    preferences.map((preference) => [preference.user_id, preference]),
  )

  const channelPreferencesByUser = new Map<string, ChannelPreferenceRow[]>()
  for (const row of channelPreferences) {
    const bucket = channelPreferencesByUser.get(row.user_id) ?? []
    bucket.push({
      notification_type: row.notification_type,
      channel: row.channel,
      enabled: row.enabled,
    })
    channelPreferencesByUser.set(row.user_id, bucket)
  }
  const optedOut = new Set(
    optOutResults.flatMap((result, index) => {
      const message = messages[index]
      if (!message || !result.data) return []
      return [`${message.channel}:${message.recipient}`]
    }),
  )

  // No delivery was attempted. Keep these rows pending without consuming the
  // provider retry budget. The SQL dispatcher waits 60s * 2^attempts after
  // updated_at before selecting them again (it leases rows before this POST).
  const mutations = messages.flatMap<OutboxMutation>((message) => {
    const lastError = lookupErrors.get(message.id)
    if (!lastError) return []
    return [
      {
        id: message.id,
        status: "pending",
        attempts: message.attempts,
        lastError,
        updatedAt: now,
      },
    ]
  })
  mutations.push(
    ...(await deliverOutboxBatch(
      messages.filter((message) => !lookupErrors.has(message.id)),
      {
        adapters: createChannelAdapters(),
        now,
        baseRetryMs: 0,
        preferenceAllows: (message) => {
          const userId = userIdFromPayload(message.payload)
          if (!userId) return true

          return outboxDeliveryAllowed({
            type: message.type,
            outboxChannel: message.channel,
            preference: preferencesByUser.get(userId),
            matrix: channelPreferencesByUser.get(userId) ?? [],
          })
        },
        optOutAllows: (channel: OutboxChannel, recipient: string) =>
          !optedOut.has(`${channel}:${recipient}`),
      },
    )),
  )

  let sent = 0
  let skipped = 0
  let failed = 0
  let pending = 0

  for (const mutation of mutations) {
    const patch: OutboxUpdate = {
      status: mutation.status,
      attempts: mutation.attempts,
      last_error: mutation.lastError ?? null,
      updated_at: new Date(mutation.updatedAt).toISOString(),
    }

    // O patch de fallback saiu com o canal WhatsApp: o banco nao tem mais
    // fallback_channel/fallback_reason e o dominio nao produz mais o campo.
    const { error: updateError } = await supabase.from("outbox").update(patch).eq("id", mutation.id)

    if (updateError) {
      log.error("outbox worker update failed", {
        id: mutation.id,
        status: mutation.status,
        error: updateError.message,
      })
      failed++
      continue
    }

    switch (mutation.status) {
      case "sent":
        sent++
        break
      case "skipped":
        skipped++
        break
      case "failed":
        failed++
        break
      case "pending":
        pending++
        break
    }
  }

  return {
    processed: mutations.length,
    sent,
    skipped,
    failed,
    pending,
  }
}
