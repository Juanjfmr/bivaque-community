// Prova da face de escrita da afiliação: valor presente é upsert com o
// is_visible do toggle, campo limpo é DELETE, o servidor revalida antes de
// qualquer escrita e o erro do banco nunca vira sucesso silencioso.
// Convenção de mock de cliente: family-invite-sad-paths-route.test.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AffiliationDraft } from "web/app/(shell)/profile/affiliation"

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], setAll: () => {} })),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { saveAffiliationAction } from "web/app/(shell)/profile/affiliation-actions"

const USER_ID = "10000000-0000-4000-8000-000000000001"

const results = vi.hoisted(() => ({
  upsert: { error: null as unknown },
  delete: { error: null as unknown },
  getUser: { data: { user: { id: "10000000-0000-4000-8000-000000000001" } } },
}))
const calls = vi.hoisted(() => ({
  upsert: [] as Record<string, unknown>[],
  deleteFilters: [] as string[][],
  from: [] as string[],
}))

function draft(over: Partial<AffiliationDraft> = {}): AffiliationDraft {
  return { armedForce: "", om: "", armedForceVisible: false, omVisible: false, ...over }
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
  results.upsert = { error: null }
  results.delete = { error: null }
  results.getUser = { data: { user: { id: USER_ID } } }
  calls.upsert = []
  calls.deleteFilters = []
  calls.from = []

  const table = {
    upsert: vi.fn(async (rows: Record<string, unknown>[]) => {
      calls.upsert.push(...rows)
      return results.upsert
    }),
    delete: vi.fn(() => {
      const filters: string[] = []
      const chain = {
        eq: vi.fn((column: string, value: string) => {
          filters.push(`${column}=${value}`)
          return chain
        }),
        in: vi.fn((column: string, values: string[]) => {
          filters.push(`${column} in [${values.join(",")}]`)
          calls.deleteFilters.push(filters)
          return Promise.resolve(results.delete)
        }),
      }
      return chain
    }),
  }

  const client = {
    auth: { getUser: vi.fn(async () => results.getUser) },
    from: vi.fn((relation: string) => {
      calls.from.push(relation)
      return table
    }),
  }

  ;(createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(client)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe("salvar — upsert com visibilidade, DELETE ao limpar, ocultar não é apagar", () => {
  it("força visível + OM oculta vão juntas para um upsert com is_visible distinto", async () => {
    await saveAffiliationAction(
      draft({
        armedForce: "marinha",
        om: "NM - 1º Distrito Naval",
        armedForceVisible: true,
        omVisible: false,
      }),
    )
    expect(calls.from).toEqual(["profile_affiliations"])
    expect(calls.upsert).toEqual([
      expect.objectContaining({
        user_id: USER_ID,
        field: "armed_force",
        value: "marinha",
        is_visible: true,
      }),
      expect.objectContaining({
        user_id: USER_ID,
        field: "om",
        value: "NM - 1º Distrito Naval",
        is_visible: false,
      }),
    ])
    expect(calls.deleteFilters).toEqual([])
    expect(revalidatePath).toHaveBeenCalledWith("/profile")
  })

  it("limpar a OM apaga a linha dela mantendo o upsert da força", async () => {
    await saveAffiliationAction(draft({ armedForce: "exercito", armedForceVisible: true }))
    expect(calls.upsert).toEqual([
      expect.objectContaining({
        field: "armed_force",
        value: "exercito",
        is_visible: true,
      }),
    ])
    expect(calls.deleteFilters).toEqual([[`user_id=${USER_ID}`, "field in [om]"]])
  })

  it("limpar os dois campos: nenhum upsert, DELETE das duas linhas", async () => {
    await saveAffiliationAction(draft({ om: "   ", omVisible: true }))
    expect(calls.upsert).toEqual([])
    expect(calls.deleteFilters).toEqual([[`user_id=${USER_ID}`, "field in [armed_force,om]"]])
  })

  it("o user_id gravado é o da sessão resolvida no servidor, não um valor do cliente", async () => {
    results.getUser = { data: { user: { id: "10000000-0000-4000-8000-000000000009" } } }
    await saveAffiliationAction(draft({ om: "Comando" }))
    expect(calls.upsert[0]).toMatchObject({
      user_id: "10000000-0000-4000-8000-000000000009",
    })
  })
})

describe("validação à direita da fronteira de confiança — antes de qualquer escrita", () => {
  it("força fora do enum recusa sem tocar no banco (negativo)", async () => {
    const evil = { ...draft(), armedForce: "general" } as AffiliationDraft
    await expect(saveAffiliationAction(evil)).rejects.toThrow(/lista aprovada/)
    expect(calls.from).toEqual([])
  })

  it("OM com CPF recusa sem tocar no banco (negativo)", async () => {
    await expect(saveAffiliationAction(draft({ om: "Unidade 529.982.247-25" }))).rejects.toThrow(
      /CPF/,
    )
    expect(calls.from).toEqual([])
  })

  it("OM acima de 80 caracteres recusa (negativo)", async () => {
    await expect(saveAffiliationAction(draft({ om: "a".repeat(81) }))).rejects.toThrow(
      /no máximo 80 caracteres/,
    )
    expect(calls.from).toEqual([])
  })

  it("toggle ligado sem valor não grava linha apontando para nada — só apaga (D3)", async () => {
    await saveAffiliationAction(draft({ armedForceVisible: true, omVisible: true }))
    expect(calls.upsert).toEqual([])
    expect(calls.deleteFilters).toEqual([[`user_id=${USER_ID}`, "field in [armed_force,om]"]])
  })
})

describe("sessão e erro do banco nunca viram sucesso silencioso", () => {
  it("sem usuário na sessão: erro recuperável, nenhuma escrita", async () => {
    results.getUser = { data: { user: null } }
    await expect(saveAffiliationAction(draft({ om: "Comando" }))).rejects.toThrow(/sessão/i)
    expect(calls.from).toEqual([])
  })

  it("check do banco (23514) no upsert vira mensagem recuperável, não sucesso", async () => {
    results.upsert = { error: { code: "23514", message: "check constraint failed" } }
    await expect(saveAffiliationAction(draft({ om: "Comando" }))).rejects.toThrow(
      /O servidor recusou um dos valores/,
    )
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("erro de permissão (42501) no delete diz para reentrar, mesmo com upsert já feito", async () => {
    results.delete = { error: { code: "42501", message: "row-level security" } }
    await expect(saveAffiliationAction(draft({ armedForce: "aeronautica" }))).rejects.toThrow(
      /sessão/i,
    )
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("erro desconhecido do banco aparece como falha genérica, nunca silêncio", async () => {
    results.upsert = {
      error: { code: "99999", message: "connection reset by peer (internal pg detail)" },
    }
    await expect(saveAffiliationAction(draft({ om: "Comando" }))).rejects.toThrow(
      "Não foi possível salvar Força Armada ou OM. Tente novamente.",
    )
  })
})
