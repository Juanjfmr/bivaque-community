// D1 Task 3 — the deterministic core of the outbox delivery worker.
// Concrete channel adapters live in apps/web and are wired later; this module
// only decides whether a row should be sent, retried, skipped, or failed.

// Um canal so desde 18/09/2026: o WhatsApp saiu do MVP por decisao do
// responsavel (o adaptador ja era unavailableAdapter e o app nunca ofereceu o
// controle). O tipo diz a verdade em vez de guardar um canal que ninguem entrega.
export type OutboxChannel = "email"
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
}

export const OUTBOX_MAX_ATTEMPTS = 5
export const OUTBOX_BASE_RETRY_MS = 60_000

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

  // O fallback saiu junto com o WhatsApp: ele era 'whatsapp falhou, cai para
  // email'. Com um canal so nao ha para onde cair, e a mutacao deixa de carregar
  // um campo que o banco tambem nao tem mais.
  return {
    id: message.id,
    status: terminal ? "failed" : "pending",
    attempts,
    lastError: result.error,
    updatedAt: now,
  }
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
