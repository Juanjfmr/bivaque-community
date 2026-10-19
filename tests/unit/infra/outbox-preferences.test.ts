// Preferência por tipo no despachante do outbox.
//
// Este teste exercita o `preferenceKey()` real de
// apps/web/app/api/internal/outbox/route.ts através do POST da rota — não é um
// mock de `preferenceAllows`. É a cobertura que prende a decisão D1 do
// ADR-20260909-canais-de-notificacao ("tipo desligado não entrega por canal
// nenhum"): o convite de evento consulta a preferência de eventos e é pulado
// quando o membro a desligou.
//
// O defeito que ele prende volta sempre da mesma forma: `preferenceKey()`
// devolve null para um tipo real e o gate `key === null || preference[key]`
// deixa a mensagem passar sem consultar preferência nenhuma. `event_invite`
// ficou fora do mapa e o convite chegava a quem desligou eventos. Por isso o
// negativo tem que passar pelo `preferenceKey()` de verdade.

import { isOutboxDue, OUTBOX_BASE_RETRY_MS } from "@bivaque/domain"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "web/app/api/internal/outbox/route"

const send = vi.fn(async () => ({ ok: true }))

vi.mock("web/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}))

vi.mock("web/lib/outbox/adapters", () => ({
  createChannelAdapters: vi.fn(() => ({
    email: { send },
  })),
}))

import { createServerClient } from "web/lib/supabase/server"

type QueryResult = { data: unknown; error: { message: string } | null }
type LookupTable =
  | "notification_preferences"
  | "notification_channel_preferences"
  | "notification_opt_outs"

function query(result: QueryResult | Error) {
  const settle = () => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result))
  const builder = {
    select: vi.fn(() => builder),
    in: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(settle),
    maybeSingle: vi.fn(settle),
    update: vi.fn((_patch: unknown) => builder),
    // Supabase query builders are awaitable thenables.
    // biome-ignore lint/suspicious/noThenProperty: the mock mirrors Supabase's awaitable builder
    then: (
      onFulfilled: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => settle().then(onFulfilled, onRejected),
  }
  return builder
}

function clientFor(
  messageType: string,
  events: boolean,
  lookups: Partial<Record<LookupTable, QueryResult | Error>> = {},
) {
  const outboxRead = query({
    data: [
      {
        id: "10000000-0000-4000-8000-000000000001",
        recipient: "recipient@example.invalid",
        channel: "email",
        type: messageType,
        payload: { user_id: "20000000-0000-4000-8000-000000000001" },
        attempts: 0,
        updated_at: "1970-01-01T00:00:00.000Z",
        last_error: null,
        status: "pending",
        created_at: "1970-01-01T00:00:00.000Z",
        fallback_channel: null,
        fallback_reason: null,
      },
    ],
    error: null,
  })
  const preferences = query(
    lookups.notification_preferences ?? {
      data: [
        {
          user_id: "20000000-0000-4000-8000-000000000001",
          comments: false,
          events,
          messages: false,
          mentions: false,
        },
      ],
      error: null,
    },
  )
  const channelPreferences = query(
    lookups.notification_channel_preferences ?? { data: [], error: null },
  )
  const optOut = query(lookups.notification_opt_outs ?? { data: null, error: null })
  const update = query({ data: null, error: null })
  outboxRead.update.mockReturnValue(update)

  return {
    update: outboxRead,
    from: vi.fn((table: string) => {
      if (table === "outbox") return outboxRead
      if (table === "notification_preferences") return preferences
      if (table === "notification_channel_preferences") return channelPreferences
      return optOut
    }),
  }
}

async function process(messageType: string, events: boolean) {
  const client = clientFor(messageType, events)
  return dispatch(client)
}

async function dispatch(client: ReturnType<typeof clientFor>) {
  vi.mocked(createServerClient).mockReturnValue(client as never)
  const response = await POST(
    new Request("http://localhost/api/internal/outbox", {
      method: "POST",
      headers: { "x-outbox-secret": "test-secret" },
      body: JSON.stringify({ ids: ["10000000-0000-4000-8000-000000000001"] }),
    }),
  )
  return response.json()
}

beforeEach(() => {
  vi.stubEnv("OUTBOX_WORKER_SECRET", "test-secret")
  send.mockClear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-10-19T12:00:00.000Z"))
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "info").mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("SEC-005: delivery lookup failures", () => {
  const tables: LookupTable[] = [
    "notification_preferences",
    "notification_channel_preferences",
    "notification_opt_outs",
  ]

  describe.each(["returned", "rejected"])("%s lookup error", (failureMode) => {
    it.each(tables)("defers %s failures without sending or immediate retry", async (table) => {
      const detail = "lookup offline for recipient@example.invalid; document 000.000.000-00"
      const client = clientFor("event_invite", true, {
        [table]:
          failureMode === "rejected"
            ? new Error(detail)
            : { data: null, error: { message: detail } },
      })

      const payload = await dispatch(client)

      expect(send).not.toHaveBeenCalled()
      expect(payload).toEqual({ processed: 1, sent: 0, skipped: 0, failed: 0, pending: 1 })
      expect(client.update.update).toHaveBeenCalledTimes(1)
      const patch = client.update.update.mock.calls[0]?.[0] as {
        status: string
        attempts: number
        last_error: string
        updated_at: string
      }
      expect(patch).toMatchObject({ status: "pending", attempts: 0 })
      expect(patch.last_error).toContain("lookup_failed")
      expect(patch.updated_at).toBe(new Date().toISOString())
      // The SQL dispatcher schedules from updated_at + 60s * 2^attempts.
      const retry = { attempts: patch.attempts, updatedAt: Date.parse(patch.updated_at) }
      const row = {
        ...retry,
        id: "retry",
        recipient: "recipient@example.invalid",
        channel: "email" as const,
        type: "event_invite",
        payload: {},
      }
      expect(isOutboxDue(row, Date.now())).toBe(false)
      expect(isOutboxDue(row, Date.now() + OUTBOX_BASE_RETRY_MS - 1)).toBe(false)
      expect(isOutboxDue(row, Date.now() + OUTBOX_BASE_RETRY_MS)).toBe(true)
      expect(console.error).toHaveBeenCalled()
      const evidence = JSON.stringify({
        errors: vi.mocked(console.error).mock.calls,
        patch,
        payload,
      })
      expect(evidence).not.toContain("recipient@example.invalid")
      expect(evidence).not.toContain("000.000.000-00")
      expect(evidence).toContain("[redacted]")
    })
  })

  it("still honors a channel disabled in the matrix", async () => {
    const client = clientFor("event_invite", true, {
      notification_channel_preferences: {
        data: [
          {
            user_id: "20000000-0000-4000-8000-000000000001",
            notification_type: "events",
            channel: "email",
            enabled: false,
          },
        ],
        error: null,
      },
    })
    expect(await dispatch(client)).toMatchObject({ sent: 0, skipped: 1, pending: 0 })
    expect(send).not.toHaveBeenCalled()
  })

  it("still honors an opt-out after a successful lookup", async () => {
    const client = clientFor("event_invite", true, {
      notification_opt_outs: { data: { recipient: "recipient@example.invalid" }, error: null },
    })
    expect(await dispatch(client)).toMatchObject({ sent: 0, skipped: 1, pending: 0 })
    expect(send).not.toHaveBeenCalled()
  })

  // A rota não consulta relógio: quem agenda é o despachante SQL, que espera
  // updated_at + 60s * 2^attempts. O teste de falha acima prova esse
  // agendamento via isOutboxDue; este prova a recuperação quando o lote é
  // reenviado depois que a consulta volta a responder.
  it("delivers when a later dispatch runs after the lookup recovers", async () => {
    const optOut: QueryResult = { data: null, error: { message: "lookup offline" } }
    const client = clientFor("event_invite", true, { notification_opt_outs: optOut })
    expect(await dispatch(client)).toMatchObject({ sent: 0, pending: 1 })
    expect(send).not.toHaveBeenCalled()

    optOut.error = null
    expect(await dispatch(client)).toMatchObject({ sent: 1, pending: 0 })
    expect(send).toHaveBeenCalledTimes(1)
    expect(client.update.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: "sent", last_error: null }),
    )
  })

  it("defers only the recipient with an inconclusive opt-out in a mixed batch", async () => {
    const client = clientFor("event_invite", true)
    const outbox = client.update
    const result = await outbox.limit()
    if (result instanceof Error || !Array.isArray(result.data)) {
      throw new Error("Expected outbox fixtures")
    }
    const first = result.data[0]
    outbox.limit.mockResolvedValue({
      data: [
        first,
        {
          ...first,
          id: "10000000-0000-4000-8000-000000000002",
          recipient: "other@example.invalid",
        },
      ],
      error: null,
    })
    const optOut = query({ data: null, error: null })
    optOut.maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "lookup offline" } })
    const originalFrom = client.from.getMockImplementation()
    client.from.mockImplementation((table) => {
      if (table === "notification_opt_outs") return optOut
      if (!originalFrom) throw new Error("Missing table fixture")
      return originalFrom(table)
    })

    expect(await dispatch(client)).toEqual({
      processed: 2,
      sent: 1,
      skipped: 0,
      failed: 0,
      pending: 1,
    })
    expect(send).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ recipient: "other@example.invalid" }),
    )
    expect(outbox.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "pending",
        last_error: "opt_out_lookup_failed",
      }),
    )
  })
})

describe("event_invite outbox preference", () => {
  it("does not deliver an event invite when events are disabled", async () => {
    await expect(process("event_invite", false)).resolves.toEqual({
      processed: 1,
      sent: 0,
      skipped: 1,
      failed: 0,
      pending: 0,
    })
    expect(send).not.toHaveBeenCalled()
  })

  it("delivers an event invite when events are enabled", async () => {
    await expect(process("event_invite", true)).resolves.toEqual({
      processed: 1,
      sent: 1,
      skipped: 0,
      failed: 0,
      pending: 0,
    })
    expect(send).toHaveBeenCalledTimes(1)
  })

  it("explicitly keeps unknown notification types allowed for compatibility", async () => {
    await expect(process("new_operational_type", false)).resolves.toMatchObject({
      processed: 1,
      sent: 1,
      skipped: 0,
    })
    expect(send).toHaveBeenCalledTimes(1)
  })

  it.each(["comment", "event_rsvp", "event_change", "direct_message"])(
    "continues honoring the existing preference mapping for %s",
    async (messageType) => {
      await expect(process(messageType, false)).resolves.toMatchObject({
        processed: 1,
        sent: 0,
        skipped: 1,
      })
      expect(send).not.toHaveBeenCalled()
    },
  )
})
