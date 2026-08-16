// D1 Task 3 — the deterministic core of the outbox delivery worker.
// Concrete channel adapters live in apps/web and are wired later; this module
// only decides whether a row should be sent, retried, skipped, or failed.

export type OutboxChannel = "email" | "whatsapp"
export type OutboxStatus = "pending" | "sent" | "failed" | "skipped"

export interface OutboxMessage {
  id: string
  recipient: string
  channel: OutboxChannel
  type: string
  payload: Record<string, unknown>
  attempts: number
  updatedAt: number
}

export interface ChannelAdapter {
  send(message: OutboxMessage): Promise<{ ok: true } | { ok: false; error: string }>
}

export interface OutboxDeliveryDeps {
  adapters: Record<OutboxChannel, ChannelAdapter>
  now?: number
  baseRetryMs?: number
  maxAttempts?: number
  preferenceAllows?: (message: OutboxMessage) => boolean
  optOutAllows?: (channel: OutboxChannel, recipient: string) => boolean
}

export interface OutboxMutation {
  id: string
  status: OutboxStatus
  attempts: number
  lastError?: string
  updatedAt: number
  fallback?: {
    channel: OutboxChannel
    reason: string
  }
}

export const OUTBOX_MAX_ATTEMPTS = 5
export const OUTBOX_BASE_RETRY_MS = 60_000
export const WHATSAPP_FALLBACK_AFTER_ATTEMPTS = 2

export function isOutboxDue(
  message: OutboxMessage,
  now: number,
  baseRetryMs = OUTBOX_BASE_RETRY_MS,
): boolean {
  return now >= message.updatedAt + baseRetryMs * 2 ** message.attempts
}

export async function deliverOutboxMessage(
  message: OutboxMessage,
  deps: OutboxDeliveryDeps,
): Promise<OutboxMutation> {
  const now = deps.now ?? Date.now()
  const maxAttempts = deps.maxAttempts ?? OUTBOX_MAX_ATTEMPTS
  const baseRetryMs = deps.baseRetryMs ?? OUTBOX_BASE_RETRY_MS

  if (message.attempts >= maxAttempts) {
    return {
      id: message.id,
      status: "failed",
      attempts: message.attempts,
      updatedAt: now,
    }
  }

  if (!isOutboxDue(message, now, baseRetryMs)) {
    return {
      id: message.id,
      status: "pending",
      attempts: message.attempts,
      updatedAt: message.updatedAt,
    }
  }

  const preferenceAllows = deps.preferenceAllows ?? (() => true)
  const optOutAllows = deps.optOutAllows ?? (() => true)

  if (!preferenceAllows(message) || !optOutAllows(message.channel, message.recipient)) {
    return {
      id: message.id,
      status: "skipped",
      attempts: message.attempts,
      updatedAt: now,
    }
  }

  const adapter = deps.adapters[message.channel]
  if (!adapter) {
    return {
      id: message.id,
      status: "failed",
      attempts: message.attempts,
      lastError: `no adapter registered for channel ${message.channel}`,
      updatedAt: now,
    }
  }

  const result = await adapter.send(message)
  if (result.ok) {
    return {
      id: message.id,
      status: "sent",
      attempts: message.attempts,
      updatedAt: now,
    }
  }

  const attempts = message.attempts + 1
  const terminal = attempts >= maxAttempts
  const mutation: OutboxMutation = {
    id: message.id,
    status: terminal ? "failed" : "pending",
    attempts,
    lastError: result.error,
    updatedAt: now,
  }

  if (message.channel === "whatsapp" && attempts >= WHATSAPP_FALLBACK_AFTER_ATTEMPTS) {
    mutation.fallback = { channel: "email", reason: result.error }
  }

  return mutation
}

export async function deliverOutboxBatch(
  messages: OutboxMessage[],
  deps: OutboxDeliveryDeps,
): Promise<OutboxMutation[]> {
  const mutations: OutboxMutation[] = []
  for (const message of messages) {
    mutations.push(await deliverOutboxMessage(message, deps))
  }
  return mutations
}
