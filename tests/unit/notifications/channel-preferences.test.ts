import { type ChannelAdapter, deliverOutboxMessage, type OutboxMessage } from "@bivaque/domain"
import { describe, expect, it } from "vitest"
import {
  type ChannelPreferenceRow,
  notificationChannelAllows,
  outboxDeliveryAllowed,
  preferenceKeyForOutboxType,
  type TypePreferenceRow,
} from "../../../apps/web/lib/notifications/channel-preferences"

// RECON-031 — the dispatcher must use the type × channel matrix, not the type
// alone. The TypeScript rule mirrors private.notification_channel_allows; the
// database twin is proven by supabase/tests/notification-channel-preferences.sql.

function prefs(overrides: Partial<TypePreferenceRow> = {}): TypePreferenceRow {
  return {
    comments: true,
    events: true,
    messages: true,
    mentions: true,
    product_news: false,
    ...overrides,
  }
}

function matrix(rows: Array<Partial<ChannelPreferenceRow>>): ChannelPreferenceRow[] {
  return rows.map((row) => ({
    notification_type: "comments",
    channel: "in_app",
    enabled: true,
    ...row,
  }))
}

function message(overrides: Partial<OutboxMessage> = {}): OutboxMessage {
  return {
    id: "10000000-0000-4000-8000-0000000000a1",
    recipient: "member-one@example.invalid",
    channel: "email",
    type: "comment",
    payload: { user_id: "10000000-0000-4000-8000-000000000001" },
    attempts: 0,
    updatedAt: 1000,
    ...overrides,
  }
}

describe("notification channel preference rule (RECON-031)", () => {
  it("maps outbox types to matrix preference keys", () => {
    expect(preferenceKeyForOutboxType("comment")).toBe("comments")
    expect(preferenceKeyForOutboxType("event_change")).toBe("events")
    expect(preferenceKeyForOutboxType("direct_message")).toBe("messages")
    expect(preferenceKeyForOutboxType("product_news")).toBe("product_news")
    expect(preferenceKeyForOutboxType("family_invite")).toBeNull()
  })

  it("keeps product_news off by default for an account without a preference row", () => {
    expect(
      outboxDeliveryAllowed({
        type: "product_news",
        outboxChannel: "email",
        preference: undefined,
        matrix: [],
      }),
    ).toBe(false)
  })

  it("delivers an enabled type on an enabled channel", () => {
    expect(
      outboxDeliveryAllowed({
        type: "comment",
        outboxChannel: "email",
        preference: prefs(),
        matrix: matrix([{ channel: "email", enabled: true }]),
      }),
    ).toBe(true)
  })

  it("blocks only the channel that is off and keeps the other", () => {
    const channelMatrix = matrix([
      { channel: "in_app", enabled: true },
      { channel: "email", enabled: false },
    ])

    expect(
      outboxDeliveryAllowed({
        type: "comment",
        outboxChannel: "email",
        preference: prefs(),
        matrix: channelMatrix,
      }),
    ).toBe(false)
    expect(
      notificationChannelAllows({
        type: "comment",
        channel: "in_app",
        preference: prefs(),
        matrix: channelMatrix,
      }),
    ).toBe(true)
  })

  it("delivers by no channel when the type is off", () => {
    const channelMatrix = matrix([
      { channel: "in_app", enabled: true },
      { channel: "email", enabled: true },
    ])
    const off = prefs({ comments: false })

    expect(
      outboxDeliveryAllowed({
        type: "comment",
        outboxChannel: "email",
        preference: off,
        matrix: channelMatrix,
      }),
    ).toBe(false)
    expect(
      notificationChannelAllows({
        type: "comment",
        channel: "in_app",
        preference: off,
        matrix: channelMatrix,
      }),
    ).toBe(false)
  })

  it("does not gate the whatsapp outbox channel by the matrix (no UI control)", () => {
    expect(
      outboxDeliveryAllowed({
        type: "comment",
        outboxChannel: "whatsapp",
        preference: prefs(),
        matrix: matrix([{ channel: "email", enabled: false }]),
      }),
    ).toBe(true)
  })
})

describe("dispatcher honours the channel rule (integration with the delivery core)", () => {
  function adapterSpy() {
    let sent = false
    const adapter: ChannelAdapter = {
      async send() {
        sent = true
        return { ok: true }
      },
    }
    return { adapter, wasSent: () => sent }
  }

  it("sends when the channel is on", async () => {
    const spy = adapterSpy()
    const result = await deliverOutboxMessage(message(), {
      adapters: { email: spy.adapter, whatsapp: spy.adapter },
      now: 2000,
      baseRetryMs: 0,
      preferenceAllows: (row) =>
        outboxDeliveryAllowed({
          type: row.type,
          outboxChannel: row.channel,
          preference: prefs(),
          matrix: matrix([{ channel: "email", enabled: true }]),
        }),
    })

    expect(result.status).toBe("sent")
    expect(spy.wasSent()).toBe(true)
  })

  it("skips when the channel is off, without sending", async () => {
    const spy = adapterSpy()
    const result = await deliverOutboxMessage(message(), {
      adapters: { email: spy.adapter, whatsapp: spy.adapter },
      now: 2000,
      baseRetryMs: 0,
      preferenceAllows: (row) =>
        outboxDeliveryAllowed({
          type: row.type,
          outboxChannel: row.channel,
          preference: prefs(),
          matrix: matrix([{ channel: "email", enabled: false }]),
        }),
    })

    expect(result.status).toBe("skipped")
    expect(spy.wasSent()).toBe(false)
  })
})
