import { timingSafeEqual } from "node:crypto"
import { deliverOutboxBatch, type OutboxChannel, type OutboxMessage } from "@bivaque/domain"
import { NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import { log } from "../../../../lib/logger"
import { createChannelAdapters } from "../../../../lib/outbox/adapters"
import { createServerClient } from "../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_BATCH = 100

type OutboxRow = Database["public"]["Tables"]["outbox"]["Row"]
type NotificationPreferencesRow = Pick<
  Database["public"]["Tables"]["notification_preferences"]["Row"],
  "user_id" | "comments" | "events" | "messages" | "mentions"
>
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

function preferenceKey(
  type: string,
): keyof Pick<NotificationPreferencesRow, "comments" | "events" | "messages" | "mentions"> | null {
  if (type === "comment") return "comments"
  if (type === "event_rsvp" || type === "event_change" || type === "event_invite") return "events"
  if (type === "direct_message") return "messages"
  return null
}

function userIdFromPayload(payload: Record<string, unknown>): string | null {
  const raw = payload["user_id"]
  return typeof raw === "string" && raw.length > 0 ? raw : null
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

  const ids = rawIds.filter((id): id is string => typeof id === "string" && id.length > 0)
  if (ids.length === 0 || ids.length > MAX_BATCH) {
    return NextResponse.json({ error: "invalid_batch" }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: rows, error: selectError } = await supabase
    .from("outbox")
    .select("*")
    .in("id", ids)
    .eq("status", "pending")
    .limit(MAX_BATCH)

  if (selectError) {
    log.error("outbox worker select failed", { error: selectError.message, count: ids.length })
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ processed: 0 })
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
  if (userIds.length > 0) {
    const { data, error: preferencesError } = await supabase
      .from("notification_preferences")
      .select("user_id, comments, events, messages, mentions")
      .in("user_id", userIds)

    if (preferencesError) {
      log.error("outbox worker preference lookup failed", {
        error: preferencesError.message,
      })
    } else {
      preferences = data ?? []
    }
  }

  const optOutResults = await Promise.all(
    messages.map((message) =>
      supabase
        .from("notification_opt_outs")
        .select("recipient")
        .eq("channel", message.channel)
        .eq("recipient", message.recipient)
        .maybeSingle(),
    ),
  )

  const preferencesByUser = new Map<string, NotificationPreferencesRow>(
    preferences.map((preference) => [preference.user_id, preference]),
  )
  const optedOut = new Set(
    optOutResults.flatMap((result, index) => {
      const message = messages[index]
      if (!message || !result.data) return []
      return [`${message.channel}:${message.recipient}`]
    }),
  )

  const mutations = await deliverOutboxBatch(messages, {
    adapters: createChannelAdapters(),
    now: Date.now(),
    baseRetryMs: 0,
    preferenceAllows: (message) => {
      const userId = userIdFromPayload(message.payload)
      if (!userId) return true

      const preference = preferencesByUser.get(userId)
      if (!preference) return true

      const key = preferenceKey(message.type)
      return key === null || preference[key]
    },
    optOutAllows: (channel: OutboxChannel, recipient: string) =>
      !optedOut.has(`${channel}:${recipient}`),
  })

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

    if (mutation.fallback) {
      patch["fallback_channel"] = mutation.fallback.channel
      patch["fallback_reason"] = mutation.fallback.reason
    }

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

  log.info("outbox worker processed batch", {
    processed: mutations.length,
    sent,
    skipped,
    failed,
    pending,
  })

  return NextResponse.json({
    processed: mutations.length,
    sent,
    skipped,
    failed,
    pending,
  })
}
