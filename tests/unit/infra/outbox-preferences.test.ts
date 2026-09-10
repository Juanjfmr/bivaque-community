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

import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "web/app/api/internal/outbox/route"

const send = vi.fn(async () => ({ ok: true }))

vi.mock("web/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}))

vi.mock("web/lib/outbox/adapters", () => ({
  createChannelAdapters: vi.fn(() => ({
    email: { send },
    whatsapp: { send },
  })),
}))

import { createServerClient } from "web/lib/supabase/server"

type QueryResult = { data: unknown; error: null }

function query(result: QueryResult) {
  const builder = {
    select: vi.fn(() => builder),
    in: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    limit: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    update: vi.fn(() => builder),
    // Supabase query builders are awaitable thenables.
    // biome-ignore lint/suspicious/noThenProperty: the mock mirrors Supabase's awaitable builder
    then: (
      onFulfilled: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  }
  return builder
}

function clientFor(messageType: string, events: boolean) {
  const outboxRead = query({
    data: [
      {
        id: "10000000-0000-4000-8000-000000000001",
        recipient: "recipient@example.com",
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
  const preferences = query({
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
  })
  const optOut = query({ data: null, error: null })
  const update = query({ data: null, error: null })
  let outboxReads = 0

  return {
    from: vi.fn((table: string) => {
      if (table === "outbox") return outboxReads++ === 0 ? outboxRead : update
      if (table === "notification_preferences") return preferences
      return optOut
    }),
  }
}

async function process(messageType: string, events: boolean) {
  const client = clientFor(messageType, events)
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
