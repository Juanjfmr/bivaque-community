import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "web/app/api/internal/outbox/route"

// M3 da revisao final de 2026-10-21 - entrega lenta nao pode reenviar uma
// mensagem ja entregue.
//
// A reserva SQL sozinha nao basta: se o envio de um bloco demorar mais que a
// reserva, outro disparo seleciona as linhas que continuam `pending` e as
// envia de novo. Persistir cada mutacao logo depois da entrega - e nao so no
// fim do bloco - fecha a janela para toda mensagem que ja foi entregue. A
// reserva de 5 minutos em `private.outbox_prepare_due()` cobre o envio em voo.
//
// O teste usa um banco em memoria que respeita `status`: a segunda chamada so
// encontra o que ainda estiver `pending`. A primeira entrega e rapida e a
// segunda fica presa ate o teste liberar. Antes da correcao, a primeira
// mensagem ainda estava `pending` quando a segunda chamada comecou e era
// enviada outra vez.

const FIRST = "10000000-0000-4000-8000-000000000001"
const SECOND = "10000000-0000-4000-8000-000000000002"

type Row = {
  id: string
  recipient: string
  channel: "email"
  type: string
  payload: Record<string, unknown>
  attempts: number
  updated_at: string
  last_error: string | null
  status: "pending" | "sent" | "failed" | "skipped"
  created_at: string
}

const state = vi.hoisted(() => ({
  rows: new Map<string, Row>(),
  sends: [] as string[],
  secondStarted: null as null | (() => void),
  releaseSecond: null as null | (() => void),
}))

const send = vi.fn(async (message: { id: string }) => {
  state.sends.push(message.id)
  if (message.id === "10000000-0000-4000-8000-000000000002") {
    state.secondStarted?.()
    await new Promise<void>((resolve) => {
      state.releaseSecond = resolve
    })
  }
  return { ok: true as const }
})

vi.mock("web/lib/supabase/server", () => ({
  createServerClient: () => ({ from }),
}))

vi.mock("web/lib/outbox/adapters", () => ({
  createChannelAdapters: () => ({ email: { send } }),
}))

function row(id: string): Row {
  return {
    id,
    recipient: `${id}@example.invalid`,
    channel: "email",
    type: "comment",
    payload: {},
    attempts: 0,
    updated_at: "1970-01-01T00:00:00.000Z",
    last_error: null,
    status: "pending",
    created_at: "1970-01-01T00:00:00.000Z",
  }
}

function outboxTable() {
  return {
    select: () => {
      let ids: string[] = []
      let status: string | null = null
      const builder = {
        in: (_column: string, values: string[]) => {
          ids = values
          return builder
        },
        eq: (_column: string, value: string) => {
          status = value
          return builder
        },
        limit: async () => ({
          data: [...state.rows.values()].filter(
            (candidate) => ids.includes(candidate.id) && candidate.status === status,
          ),
          error: null,
        }),
      }
      return builder
    },
    update: (patch: Partial<Row>) => {
      let id: string | null = null
      const builder = {
        eq: (_column: string, value: string) => {
          id = value
          return builder
        },
        // biome-ignore lint/suspicious/noThenProperty: the mock mirrors Supabase's awaitable builder
        then: (
          onFulfilled: (value: { data: null; error: null }) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) => {
          const target = id === null ? undefined : state.rows.get(id)
          if (target) Object.assign(target, patch)
          return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected)
        },
      }
      return builder
    },
  }
}

function emptyTable() {
  const builder = {
    select: () => builder,
    in: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({ data: null, error: null }),
    // biome-ignore lint/suspicious/noThenProperty: the mock mirrors Supabase's awaitable builder
    then: (
      onFulfilled: (value: { data: unknown[]; error: null }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected),
  }
  return builder
}

const outbox = outboxTable()
const preferences = emptyTable()
const channelPreferences = emptyTable()
const optOuts = emptyTable()

function from(table: string) {
  if (table === "outbox") return outbox
  if (table === "notification_preferences") return preferences
  if (table === "notification_channel_preferences") return channelPreferences
  return optOuts
}

function dispatch(ids: string[]) {
  return POST(
    new Request("http://localhost/api/internal/outbox", {
      method: "POST",
      headers: { "x-outbox-secret": "test-secret" },
      body: JSON.stringify({ ids }),
    }),
  )
}

beforeEach(() => {
  vi.stubEnv("OUTBOX_WORKER_SECRET", "test-secret")
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "info").mockImplementation(() => {})
  state.rows.clear()
  state.rows.set(FIRST, row(FIRST))
  state.rows.set(SECOND, row(SECOND))
  state.sends.length = 0
  state.releaseSecond = null
})

afterEach(() => {
  state.releaseSecond?.()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("M3 entrega lenta do outbox", () => {
  it("nao reenvia mensagem ja entregue enquanto outra ainda esta em voo", async () => {
    let started: () => void = () => undefined
    const secondStarted = new Promise<void>((resolve) => {
      started = resolve
    })
    state.secondStarted = started

    const first = dispatch([FIRST, SECOND])
    await secondStarted

    // A primeira entrega terminou e a segunda esta presa no adaptador.
    // Persistir por mensagem deixa a primeira como `sent` antes de a segunda
    // comecar; a chamada concorrente nao pode seleciona-la.
    expect(state.rows.get(FIRST)?.status).toBe("sent")
    expect(state.sends).toEqual([FIRST, SECOND])

    const second = await dispatch([FIRST])
    expect(second.status).toBe(200)
    expect(state.sends.filter((id) => id === FIRST)).toHaveLength(1)

    state.releaseSecond?.()
    await first
    expect(state.rows.get(SECOND)?.status).toBe("sent")
  })
})
