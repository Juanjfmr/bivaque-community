// SEC-005 / revisão H4: um lote maior que 100 avisos vencidos não pode ser
// rejeitado inteiro. `private.outbox_prepare_due()` já avançou `updated_at`
// desses itens antes do POST; se a rota responde 400, os mesmos itens voltam a
// vencer no próximo minuto e a fila trava para sempre.
//
// O teste envia 250 IDs e exige que todos sejam entregues. Ele falha na rota
// antiga com `400 invalid_batch` antes de qualquer envio.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "web/app/api/internal/outbox/route"

const send = vi.fn(async () => ({ ok: true as const }))

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

// SEC-AUD-004: a rota so envia itens que continuam pertencendo ao token da
// reserva. O lote de teste simula uma reserva valida deste token.
const RESERVATION = "cccccccc-0000-4000-8000-00000000000c"

function idFor(index: number): string {
  return `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`
}

function rowFor(index: number) {
  return {
    id: idFor(index),
    recipient: `recipient-${index}@example.invalid`,
    channel: "email",
    type: "comment",
    payload: {},
    attempts: 0,
    updated_at: "1970-01-01T00:00:00.000Z",
    last_error: null,
    status: "pending",
    created_at: "1970-01-01T00:00:00.000Z",
    reserved_until: new Date(Date.now() + 5 * 60_000).toISOString(),
    reserved_by: RESERVATION,
  }
}

function thenable(result: () => QueryResult | Promise<QueryResult>) {
  const builder: Record<string, unknown> = {}
  const settle = () => Promise.resolve(result())
  builder.select = vi.fn(() => builder)
  builder.in = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.limit = vi.fn(() => builder)
  builder.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
  // biome-ignore lint/suspicious/noThenProperty: the mock mirrors Supabase's awaitable builder
  builder.then = (
    onFulfilled: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => settle().then(onFulfilled, onRejected)
  return builder
}

function clientFor(count: number) {
  const rows = Array.from({ length: count }, (_, index) => rowFor(index))
  const rowsById = new Map(rows.map((row) => [row.id, row]))
  const selectedChunkSizes: number[] = []
  let selectedIds: string[] = []

  const outboxSelect = thenable(() => ({ data: rows, error: null }))
  outboxSelect.in = vi.fn((column: string, values: string[]) => {
    if (column === "id") {
      selectedIds = values
      selectedChunkSizes.push(values.length)
    }
    return outboxSelect
  })
  // Cada chunk seleciona somente os próprios IDs; o mock devolve as linhas
  // correspondentes para provar que nenhum ID ficou de fora.
  outboxSelect.limit = vi.fn(() =>
    thenable(() => ({
      data: selectedIds.flatMap((id) => {
        const row = rowsById.get(id)
        return row ? [row] : []
      }),
      error: null,
    })),
  )
  const outboxRead = outboxSelect

  // A leitura de reserva feita antes de cada envio confirma o token.
  const reservationCheck = {
    eq: vi.fn(() => reservationCheck),
    maybeSingle: vi.fn(async () => ({
      data: {
        reserved_by: RESERVATION,
        reserved_until: new Date(Date.now() + 5 * 60_000).toISOString(),
      },
      error: null,
    })),
  }
  outboxRead.select = vi.fn((columns: string) => (columns === "*" ? outboxRead : reservationCheck))

  const updateBuilder = thenable(() => ({ data: [{ id: "persisted" }], error: null }))
  const update = vi.fn(() => updateBuilder)
  outboxRead.update = update

  const preferences = thenable(() => ({ data: [], error: null }))
  const channelPreferences = thenable(() => ({ data: [], error: null }))
  const optOut = thenable(() => ({ data: null, error: null }))

  return {
    client: {
      from: vi.fn((table: string) => {
        if (table === "outbox") return outboxRead
        if (table === "notification_preferences") return preferences
        if (table === "notification_channel_preferences") return channelPreferences
        return optOut
      }),
    },
    update,
    selectedChunkSizes,
  }
}

async function dispatch(ids: string[]) {
  const { client, update, selectedChunkSizes } = clientFor(ids.length)
  vi.mocked(createServerClient).mockReturnValue(client as never)
  const response = await POST(
    new Request("http://localhost/api/internal/outbox", {
      method: "POST",
      headers: { "x-outbox-secret": "test-secret" },
      body: JSON.stringify({ ids, reservation: RESERVATION }),
    }),
  )
  return { response, payload: await response.json(), update, selectedChunkSizes }
}

beforeEach(() => {
  vi.stubEnv("OUTBOX_WORKER_SECRET", "test-secret")
  send.mockClear()
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "info").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("SEC-005 H4: large due batches", () => {
  it("processes every ID of a 250-item batch in chunks of at most 100", async () => {
    const ids = Array.from({ length: 250 }, (_, index) => idFor(index))

    const { response, payload, update, selectedChunkSizes } = await dispatch(ids)

    expect(response.status).toBe(200)
    expect(payload).toEqual({ processed: 250, sent: 250, skipped: 0, failed: 0, pending: 0 })
    expect(send).toHaveBeenCalledTimes(250)
    expect(update).toHaveBeenCalledTimes(250)
    expect(selectedChunkSizes).toEqual([100, 100, 50])
  })

  it("rejects a batch above the documented 5.000-ID safety ceiling", async () => {
    const ids = Array.from({ length: 5_001 }, (_, index) => idFor(index))

    const { response, payload, update } = await dispatch(ids)

    expect(response.status).toBe(400)
    expect(payload).toEqual({ error: "invalid_batch" })
    expect(update).not.toHaveBeenCalled()
  })
})
