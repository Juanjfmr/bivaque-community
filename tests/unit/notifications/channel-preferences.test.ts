import { readFileSync } from "node:fs"
import { join } from "node:path"
import { type ChannelAdapter, deliverOutboxMessage, type OutboxMessage } from "@bivaque/domain"
import { describe, expect, it } from "vitest"
import {
  type ChannelPreferenceRow,
  type NotificationTypeKey,
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

  it("has exactly one outbox channel, and the matrix gates it", () => {
    // Este teste provava que o WhatsApp NÃO era barrado pela matriz, porque o app
    // não oferecia controle para ele. O canal saiu do MVP em 18/09/2026, então o
    // que importa garantir agora é o inverso: com um canal só, a matriz MANDA —
    // nao existe caminho de entrega que escape da preferência da pessoa.
    expect(
      outboxDeliveryAllowed({
        type: "comment",
        outboxChannel: "email",
        preference: prefs(),
        matrix: matrix([{ channel: "email", enabled: false }]),
      }),
    ).toBe(false)
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
      adapters: { email: spy.adapter },
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
      adapters: { email: spy.adapter },
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

// Este bloco existe porque o mapeamento ja perdeu `event_invite` duas vezes.
// A perda e invisivel: `preferenceKeyForOutboxType` devolve null para tipo
// desconhecido e o filtro trata null como "pode entregar". Um tipo novo que
// ninguem declarar passa a furar a preferencia da pessoa em silencio.
// Aqui todo tipo que o adaptador sabe montar precisa de uma decisao escrita.
describe("todo tipo de outbox tem decisao declarada de preferencia", () => {
  // null = transacional por decisao: a pessoa nao escolhe receber ou nao.
  const DECISAO: Record<string, NotificationTypeKey | null> = {
    comment: "comments",
    event_rsvp: "events",
    event_change: "events",
    event_reminder: "events",
    event_invite: "events",
    direct_message: "messages",
    product_news: "product_news",
    verification_decision: null,
    verification_resolved: null,
    recommendation_reply: null,
    community_invite: null,
    family_invite: null,
    provider_invite: null,
  }

  it("o adaptador nao monta nenhum tipo sem decisao declarada", () => {
    const fonte = readFileSync(join(process.cwd(), "apps/web/lib/outbox/adapters.ts"), "utf8")
    const tipos = [...fonte.matchAll(/case "([a-z_]+)":/g)].map((m) => m[1] as string)
    expect(tipos.length).toBeGreaterThan(0)
    const semDecisao = tipos.filter((tipo) => !(tipo in DECISAO))
    expect(semDecisao).toEqual([])
  })

  it("cada decisao declarada e a que o filtro realmente aplica", () => {
    for (const [tipo, esperado] of Object.entries(DECISAO)) {
      expect(preferenceKeyForOutboxType(tipo), tipo).toBe(esperado)
    }
  })

  it("convite de evento nao chega a quem desligou eventos", () => {
    const entregue = outboxDeliveryAllowed({
      type: "event_invite",
      outboxChannel: "email",
      preference: prefs({ events: false }),
      matrix: [],
    })
    expect(entregue).toBe(false)
  })
})
