// Revisao da confirmacao de 2026-10-21 (media) - a reserva do outbox tem dono.
//
// Cenario do Codex: a execucao A passa dos 5 minutos de reserva, a execucao B
// reserva os mesmos itens e envia. Quando A termina, envia de novo e ainda pode
// sobrescrever o resultado de B.
//
// A rota recebe o token da reserva (`reservation`), confere antes de cada envio
// que o item ainda pertence a ela e grava o resultado filtrando por esse token.
// O banco em memoria respeita `reserved_by`: a segunda execucao so encontra o
// item quando a reserva de A venceu, e a escrita de A deixa de casar quando B
// tomou a linha.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "web/app/api/internal/outbox/route"

const FIRST = "10000000-0000-4000-8000-000000000001"
const SECOND = "10000000-0000-4000-8000-000000000002"
const THIRD = "10000000-0000-4000-8000-000000000003"

const TOKEN_A = "aaaaaaaa-0000-4000-8000-00000000000a"
const TOKEN_B = "bbbbbbbb-0000-4000-8000-00000000000b"

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
  reserved_until: string | null
  reserved_by: string | null
}

const state = vi.hoisted(() => ({
  rows: new Map<string, Row>(),
  sends: [] as string[],
  holdUpdateFor: null as string | null,
  updateReached: null as null | (() => void),
  releaseUpdate: null as null | (() => void),
}))

const send = vi.fn(async (message: { id: string }) => {
  state.sends.push(message.id)
  return { ok: true as const }
})

vi.mock("web/lib/supabase/server", () => ({
  createServerClient: () => ({ from }),
}))

vi.mock("web/lib/outbox/adapters", () => ({
  createChannelAdapters: () => ({ email: { send } }),
}))

function row(id: string, overrides: Partial<Row> = {}): Row {
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
    reserved_until: new Date(Date.now() + 5 * 60_000).toISOString(),
    reserved_by: TOKEN_A,
    ...overrides,
  }
}

function outboxTable() {
  return {
    select: (columns: string) => {
      const filters: Record<string, string> = {}
      let ids: string[] = []

      if (columns !== "*") {
        const builder = {
          eq: (column: string, value: string) => {
            filters[column] = value
            return builder
          },
          maybeSingle: async () => {
            const candidate = filters.id === undefined ? undefined : state.rows.get(filters.id)
            if (!candidate || candidate.reserved_by !== filters.reserved_by) {
              return { data: null, error: null }
            }
            return {
              data: {
                reserved_by: candidate.reserved_by,
                reserved_until: candidate.reserved_until,
              },
              error: null,
            }
          },
        }
        return builder
      }

      const builder = {
        in: (_column: string, values: string[]) => {
          ids = values
          return builder
        },
        eq: (column: string, value: string) => {
          filters[column] = value
          return builder
        },
        limit: async () => ({
          data: [...state.rows.values()].filter(
            (candidate) => ids.includes(candidate.id) && candidate.status === filters.status,
          ),
          error: null,
        }),
      }
      return builder
    },
    update: (patch: Partial<Row>) => {
      const filters: Record<string, string> = {}
      const builder = {
        eq: (column: string, value: string) => {
          filters[column] = value
          return builder
        },
        select: () => ({
          // biome-ignore lint/suspicious/noThenProperty: the mock mirrors Supabase's awaitable builder
          then: async (
            onFulfilled: (value: { data: Array<{ id: string }>; error: null }) => unknown,
            onRejected?: (reason: unknown) => unknown,
          ) => {
            const id = filters.id
            if (id !== undefined && id === state.holdUpdateFor) {
              state.updateReached?.()
              await new Promise<void>((resolve) => {
                state.releaseUpdate = resolve
              })
            }

            const target = id === undefined ? undefined : state.rows.get(id)
            const matches =
              target !== undefined &&
              (filters.reserved_by === undefined || target.reserved_by === filters.reserved_by)
            if (target && matches) Object.assign(target, patch)

            return Promise.resolve({
              data: target && matches ? [{ id: target.id }] : [],
              error: null,
            }).then(onFulfilled, onRejected)
          },
        }),
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

function dispatch(ids: string[], reservation: string) {
  return POST(
    new Request("http://localhost/api/internal/outbox", {
      method: "POST",
      headers: { "x-outbox-secret": "test-secret" },
      body: JSON.stringify({ ids, reservation }),
    }),
  )
}

function holdUpdates() {
  let reached: () => void = () => undefined
  const started = new Promise<void>((resolve) => {
    reached = resolve
  })
  state.updateReached = reached
  return started
}

beforeEach(() => {
  vi.stubEnv("OUTBOX_WORKER_SECRET", "test-secret")
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "info").mockImplementation(() => {})
  state.rows.clear()
  state.rows.set(FIRST, row(FIRST))
  state.rows.set(SECOND, row(SECOND))
  state.sends.length = 0
  state.holdUpdateFor = null
  state.updateReached = null
  state.releaseUpdate = null
})

afterEach(() => {
  state.releaseUpdate?.()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("reserva do outbox com dono", () => {
  it("nao envia o item que outra execucao passou a reservar", async () => {
    // A entrega do primeiro item esta em andamento quando a reserva de A vence.
    state.holdUpdateFor = FIRST
    const firstUpdateStarted = holdUpdates()

    const executionA = dispatch([FIRST, SECOND], TOKEN_A)
    await firstUpdateStarted

    // B reserva o segundo item (a reserva de A venceu) e o envia.
    const secondRow = state.rows.get(SECOND)
    if (!secondRow) throw new Error("missing second row")
    secondRow.reserved_by = TOKEN_B
    secondRow.reserved_until = new Date(Date.now() + 5 * 60_000).toISOString()

    const executionB = await dispatch([SECOND], TOKEN_B)
    expect(executionB.status).toBe(200)
    expect(state.sends).toEqual([FIRST, SECOND])

    state.releaseUpdate?.()
    const responseA = await executionA
    expect(responseA.status).toBe(200)

    // Cada item saiu uma unica vez: A entregou o primeiro, B o segundo.
    expect(state.sends.filter((id) => id === FIRST)).toHaveLength(1)
    expect(state.sends.filter((id) => id === SECOND)).toHaveLength(1)
    expect(await responseA.json()).toMatchObject({ sent: 1, skipped: 1 })
  })

  it("gravacao atrasada com o token antigo nao sobrescreve o resultado de B", async () => {
    state.holdUpdateFor = FIRST
    const updateStarted = holdUpdates()

    const executionA = dispatch([FIRST], TOKEN_A)
    await updateStarted

    // B tomou a linha e gravou o proprio resultado enquanto A esperava.
    const firstRow = state.rows.get(FIRST)
    if (!firstRow) throw new Error("missing first row")
    firstRow.reserved_by = TOKEN_B
    firstRow.reserved_until = null
    firstRow.status = "pending"
    firstRow.attempts = 1
    firstRow.last_error = "provider down"

    state.releaseUpdate?.()
    const responseA = await executionA
    expect(responseA.status).toBe(200)

    const stored = state.rows.get(FIRST)
    expect(stored?.status).toBe("pending")
    expect(stored?.attempts).toBe(1)
    expect(stored?.last_error).toBe("provider down")
    expect(stored?.reserved_by).toBe(TOKEN_B)
    expect(await responseA.json()).toMatchObject({ sent: 0, skipped: 1 })
  })

  it("para de enviar os itens restantes quando a reserva vence no meio do lote", async () => {
    state.rows.set(THIRD, row(THIRD))
    state.holdUpdateFor = FIRST
    const updateStarted = holdUpdates()

    const executionA = dispatch([FIRST, SECOND, THIRD], TOKEN_A)
    await updateStarted

    // A reserva venceu antes de A chegar aos itens seguintes; ninguem os tomou.
    const past = new Date(Date.now() - 1000).toISOString()
    for (const id of [SECOND, THIRD]) {
      const candidate = state.rows.get(id)
      if (!candidate) throw new Error(`missing row ${id}`)
      candidate.reserved_until = past
    }

    state.releaseUpdate?.()
    const responseA = await executionA
    expect(responseA.status).toBe(200)

    expect(state.sends).toEqual([FIRST])
    expect(await responseA.json()).toMatchObject({ processed: 1, sent: 1 })
    expect(state.rows.get(SECOND)?.status).toBe("pending")
    expect(state.rows.get(THIRD)?.status).toBe("pending")
  })

  it("recusa o lote sem o token da reserva", async () => {
    const response = await POST(
      new Request("http://localhost/api/internal/outbox", {
        method: "POST",
        headers: { "x-outbox-secret": "test-secret" },
        body: JSON.stringify({ ids: [FIRST] }),
      }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "invalid_body" })
    expect(state.sends).toEqual([])
  })
})
