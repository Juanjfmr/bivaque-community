import {
  type ChannelAdapter,
  deliverOutboxBatch,
  deliverOutboxMessage,
  isOutboxDue,
  OUTBOX_MAX_ATTEMPTS,
  type OutboxMessage,
} from "@bivaque/domain"
import { describe, expect, it } from "vitest"

function message(overrides: Partial<OutboxMessage> = {}): OutboxMessage {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    recipient: "recipient@example.com",
    channel: "email",
    type: "comment",
    payload: {},
    attempts: 0,
    updatedAt: 1000,
    ...overrides,
  }
}

function okAdapter(): ChannelAdapter {
  return {
    async send() {
      return { ok: true }
    },
  }
}

function failingAdapter(error: string): ChannelAdapter {
  return {
    async send() {
      return { ok: false, error }
    },
  }
}

const email = okAdapter()

describe("outbox delivery worker core (D1 Task 3)", () => {
  it("sends a due message and marks it sent", async () => {
    const result = await deliverOutboxMessage(message(), {
      adapters: { email },
      now: 2000,
      baseRetryMs: 0,
    })

    expect(result.status).toBe("sent")
  })

  it("skips when the preference for the type is off, without sending", async () => {
    let sent = false
    const adapter: ChannelAdapter = {
      async send() {
        sent = true
        return { ok: true }
      },
    }

    const result = await deliverOutboxMessage(message({ type: "comment" }), {
      adapters: { email: adapter },
      now: 2000,
      baseRetryMs: 0,
      preferenceAllows: (row) => row.type !== "comment",
    })

    expect(result.status).toBe("skipped")
    expect(sent).toBe(false)
  })

  it("skips when the recipient opted out of the channel, without sending", async () => {
    let sent = false
    const adapter: ChannelAdapter = {
      async send() {
        sent = true
        return { ok: true }
      },
    }

    const result = await deliverOutboxMessage(message(), {
      adapters: { email: adapter },
      now: 2000,
      baseRetryMs: 0,
      optOutAllows: (channel) => channel !== "email",
    })

    expect(result.status).toBe("skipped")
    expect(sent).toBe(false)
  })

  it("keeps a not-yet-due message pending", async () => {
    const result = await deliverOutboxMessage(message({ attempts: 1, updatedAt: 1000 }), {
      adapters: { email },
      now: 1100,
      baseRetryMs: 60_000,
    })

    expect(result.status).toBe("pending")
    expect(result.attempts).toBe(1)
  })

  it("retries a failed message with exponential backoff and keeps it pending", async () => {
    const result = await deliverOutboxMessage(message(), {
      adapters: { email: failingAdapter("provider down") },
      now: 2000,
      baseRetryMs: 0,
    })

    expect(result.status).toBe("pending")
    expect(result.attempts).toBe(1)
    expect(result.lastError).toBe("provider down")
  })

  it("marks a message failed after the retry ceiling", async () => {
    const result = await deliverOutboxMessage(message({ attempts: OUTBOX_MAX_ATTEMPTS - 1 }), {
      adapters: { email: failingAdapter("still down") },
      now: 2000,
      baseRetryMs: 0,
    })

    expect(result.status).toBe("failed")
    expect(result.attempts).toBe(OUTBOX_MAX_ATTEMPTS)
  })

  it("processes a batch and leaves not-due rows untouched", async () => {
    const due = message({ id: "due", updatedAt: 0 })
    const notDue = message({ id: "not-due", attempts: 1, updatedAt: 20_000 })

    const results = await deliverOutboxBatch([due, notDue], {
      adapters: { email },
      now: 10_000,
      baseRetryMs: 0,
    })

    expect(results).toEqual([
      expect.objectContaining({ id: "due", status: "sent" }),
      expect.objectContaining({ id: "not-due", status: "pending" }),
    ])
  })
})

describe("isOutboxDue", () => {
  it("uses exponential backoff", () => {
    const row = message({ attempts: 2, updatedAt: 0 })
    expect(isOutboxDue(row, 4 * 60_000, 60_000)).toBe(true)
    expect(isOutboxDue(row, 4 * 60_000 - 1, 60_000)).toBe(false)
  })
})
