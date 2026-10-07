import { beforeEach, describe, expect, it, vi } from "vitest"

// FIGMA-002 — salvamento de anúncio: o contrato é "privado e falha fechada".
//
// O que esta prova trava é a decisão da aplicação: a relação gravada/lida é
// sempre a do próprio caller, o estado "salvo" falha fechado quando não há
// sessão ou quando o banco recusa, e a negativa de RLS vira recusa do produto —
// nunca um "salvo" que o reload desmente. As condições de acesso do anúncio
// (active, não ocultado, audiência alcançada) são do banco e estão provadas no
// pgTAP; duplicá-las aqui seria fingir prova de onde ela não vem.

const fixture = vi.hoisted(() => ({
  authenticated: true,
  upsert: vi.fn(),
  deleteEq: vi.fn(),
  upsertError: null as { code?: string } | null,
  deleteError: null as { code?: string } | null,
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

vi.mock("../../../apps/web/lib/listings/server", () => ({
  createUserClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: fixture.authenticated ? { id: "caller-uuid" } : null },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table !== "listing_saves") throw new Error(`unexpected table ${table}`)
      const upsertChain = {
        select: () => upsertChain,
        maybeSingle: async () => ({
          data: fixture.upsertError ? null : { listing_id: "listing-uuid" },
          error: fixture.upsertError,
        }),
      }
      return {
        upsert: (row: unknown, options: unknown) => {
          fixture.upsert(row, options)
          return upsertChain
        },
        delete: () => {
          let calls = 0
          const chain = {
            eq: (column: string, value: unknown) => {
              fixture.deleteEq(column, value)
              calls += 1
              // O código real encadeia dois .eq e aguarda o último; devolver a
              // promise no segundo filtro evita um thenable artificial aqui.
              return calls >= 2 ? Promise.resolve({ error: fixture.deleteError }) : chain
            },
          }
          return chain
        },
      }
    },
  }),
}))

import { saveListing, unsaveListing } from "../../../apps/web/lib/listings/saves"

const listingId = "81000000-0000-4000-8000-000000000301"
function form(value = listingId) {
  const data = new FormData()
  data.set("listing_id", value)
  return data
}

beforeEach(() => {
  fixture.authenticated = true
  fixture.upsert.mockReset()
  fixture.deleteEq.mockReset()
  fixture.upsertError = null
  fixture.deleteError = null
})

describe("saveListing", () => {
  it("grava o save do próprio caller, idempotente, e confirma pelo reload", async () => {
    expect(await saveListing(form())).toEqual({ ok: true, error: null })
    expect(fixture.upsert).toHaveBeenCalledWith(
      { user_id: "caller-uuid", listing_id: listingId },
      { onConflict: "user_id,listing_id", ignoreDuplicates: true },
    )
  })

  it("recusa id inválido antes de qualquer escrita", async () => {
    const result = await saveListing(form("não é uuid"))
    expect(result.ok).toBe(false)
    expect(fixture.upsert).not.toHaveBeenCalled()
  })

  it("sem sessão não grava nada", async () => {
    fixture.authenticated = false
    const result = await saveListing(form())
    expect(result.ok).toBe(false)
    expect(result.error).toContain("Entre para salvar")
    expect(fixture.upsert).not.toHaveBeenCalled()
  })

  it("negativa de RLS vira recusa do produto, nunca sucesso sem persistência", async () => {
    fixture.upsertError = { code: "42501" }
    expect(await saveListing(form())).toEqual({
      ok: false,
      error: "Este anúncio não está disponível para salvar agora.",
    })
  })

  it("falha de banco é relatada como erro recuperável, não como salvo", async () => {
    fixture.upsertError = { code: "57014" }
    const result = await saveListing(form())
    expect(result.ok).toBe(false)
    expect(result.error).toContain("Não foi possível salvar")
  })
})

describe("unsaveListing", () => {
  it("apaga filtrando por caller e anúncio, e não por service_role", async () => {
    expect(await unsaveListing(form())).toEqual({ ok: true, error: null })
    expect(fixture.deleteEq).toHaveBeenNthCalledWith(1, "user_id", "caller-uuid")
    expect(fixture.deleteEq).toHaveBeenNthCalledWith(2, "listing_id", listingId)
  })

  it("sem sessão não apaga nada", async () => {
    fixture.authenticated = false
    const result = await unsaveListing(form())
    expect(result.ok).toBe(false)
    expect(result.error).toContain("Entre para gerenciar")
    expect(fixture.deleteEq).not.toHaveBeenCalled()
  })

  it("erro de remoção é relatado", async () => {
    fixture.deleteError = { code: "42501" }
    const result = await unsaveListing(form())
    expect(result.ok).toBe(false)
    expect(result.error).toContain("Não foi possível remover dos salvos")
  })
})
