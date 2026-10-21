import { timingSafeEqual } from "node:crypto"
import {
  deliverOutboxMessage,
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Teto de segurança do lote total. A reserva SQL entrega no máximo este mesmo
// número por chamada (SEC-AUD-002); 5.000 cobre uma fila bem acima do volume
// normal e ainda impede que um payload arbitrário abra milhares de consultas
// numa única requisição. O processamento é fatiado em blocos de MAX_BATCH.
// Rejeitar o lote inteiro travava a fila para sempre (SEC-005 H4), porque o SQL
// já havia avançado `updated_at` dos itens.
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

// A reserva so vale se a linha ainda pertence a este token e nao venceu. A
// consulta e feita imediatamente antes de cada envio: uma execucao lenta pode
// ter perdido a reserva para outra no meio do bloco.
type ReservationStatus = "owned" | "superseded" | "expired" | "unknown"

async function reservationStatus(
  supabase: ReturnType<typeof createServerClient>,
  id: string,
  reservation: string,
): Promise<ReservationStatus> {
  const { data, error } = await deliveryLookup<{
    reserved_by: string | null
    reserved_until: string | null
  }>(
    supabase
      .from("outbox")
      .select("reserved_by, reserved_until")
      .eq("id", id)
      .eq("reserved_by", reservation)
      .maybeSingle(),
  )

  if (error) {
    log.error("outbox worker reservation lookup failed", {
      id,
      error: scrubPii(error.message),
    })
    return "unknown"
  }

  if (data === null || data.reserved_until === null) return "superseded"

  const until = Date.parse(data.reserved_until)
  if (!Number.isFinite(until) || until <= Date.now()) return "expired"

  return "owned"
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

  // SEC-AUD-004: o disparo SQL reserva os itens com um token por chamada. Sem
  // o token nao ha como provar que o item ainda pertence a esta execucao, e
  // enviar sem essa prova e exatamente o reenvio duplicado que a correcao
  // fecha.
  const rawReservation = (body as { reservation?: unknown }).reservation
  if (typeof rawReservation !== "string" || !UUID_PATTERN.test(rawReservation)) {
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
    const counts = await processBatch(chunk, rawReservation, supabase, now)
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
  reservation: string,
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

  // Persistir a mutacao logo depois de cada entrega, e nao so no fim do bloco:
  // se uma entrega demora, as anteriores ja estao `sent` no banco e outro
  // disparo nao as seleciona de novo. A reserva de 5 minutos em
  // `private.outbox_prepare_due()` cobre a mensagem que esta em voo.
  const deliveryDeps = {
    adapters: createChannelAdapters(),
    now,
    baseRetryMs: 0,
    preferenceAllows: (message: OutboxMessage) => {
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
  }

  const counts: BatchCounts = { processed: 0, sent: 0, skipped: 0, failed: 0, pending: 0 }

  for (const message of messages) {
    const status = await reservationStatus(supabase, message.id, reservation)

    // A reserva venceu no meio do lote: nada mais desta execucao pode sair.
    // Os itens restantes ficam `pending` e voltam a ser elegiveis na proxima
    // chamada de `private.outbox_prepare_due()`.
    if (status === "expired") {
      log.info("outbox worker reservation expired mid-batch", {
        id: message.id,
        remaining: messages.length - counts.processed - counts.skipped - counts.failed,
      })
      break
    }

    // Outra execucao passou a ser dona do item (ou a consulta foi
    // inconclusiva): nao envia e nao grava nada.
    if (status !== "owned") {
      counts.skipped++
      continue
    }

    const lastError = lookupErrors.get(message.id)
    const mutation: OutboxMutation = lastError
      ? {
          // Nenhuma entrega foi tentada. A linha fica pending sem consumir a
          // tentativa do provedor; o despachante SQL volta a seleciona-la
          // depois do prazo de tentativa.
          id: message.id,
          status: "pending",
          attempts: message.attempts,
          lastError,
          updatedAt: now,
        }
      : await deliverOutboxMessage(message, deliveryDeps)

    const patch: OutboxUpdate = {
      status: mutation.status,
      attempts: mutation.attempts,
      last_error: mutation.lastError ?? null,
      updated_at: new Date(mutation.updatedAt).toISOString(),
      // A reserva do despachante SQL termina aqui: a mutacao ja foi gravada.
      reserved_until: null,
      reserved_by: null,
    }

    // O patch de fallback saiu com o canal WhatsApp: o banco nao tem mais
    // fallback_channel/fallback_reason e o dominio nao produz mais o campo.
    // O filtro por `reserved_by` impede que uma execucao atrasada sobrescreva
    // o resultado de quem tomou a reserva depois dela.
    const { data: persisted, error: updateError } = await supabase
      .from("outbox")
      .update(patch)
      .eq("id", mutation.id)
      .eq("reserved_by", reservation)
      .select("id")

    if (updateError) {
      log.error("outbox worker update failed", {
        id: mutation.id,
        status: mutation.status,
        error: updateError.message,
      })
      counts.failed++
      continue
    }

    if (!persisted || persisted.length === 0) {
      log.info("outbox worker lost the reservation before writing", { id: mutation.id })
      counts.skipped++
      continue
    }

    counts.processed++

    switch (mutation.status) {
      case "sent":
        counts.sent++
        break
      case "skipped":
        counts.skipped++
        break
      case "failed":
        counts.failed++
        break
      case "pending":
        counts.pending++
        break
    }
  }

  return counts
}
