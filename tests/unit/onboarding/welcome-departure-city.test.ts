import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// PORT-005 (correção do achado P2): a cidade de destino das boas-vindas.
//
// A policy de `localities` só libera a cidade do próprio vínculo, e o destino de
// quem sai é outra cidade — lida no navegador, voltava vazia e o bloco da saída
// caía no de "moro aqui". A action resolve o destino na linha de momento do
// PRÓPRIO chamador (pela sessão) e só então lê o nome no catálogo.
// Convenção de mock: interests-require-verification.test.ts.

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], setAll: () => {} })),
}))

const state = vi.hoisted(() => ({
  hasSession: true,
  moment: null as { destination_locality_id: string | null } | null,
  momentError: null as { message: string } | null,
  tables: [] as string[],
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: async () => ({
        data: {
          user: state.hasSession ? { id: "10000000-0000-4000-8000-000000000001" } : null,
        },
      }),
    },
  })),
}))

vi.mock("web/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    from: (table: string) => {
      state.tables.push(table)
      const query = {
        eq: () => query,
        maybeSingle: async () => {
          if (table === "member_entry_moments") {
            return { data: state.moment, error: state.momentError }
          }
          if (table === "localities") {
            return { data: { city_name: "Rio de Janeiro" }, error: null }
          }
          return { data: null, error: null }
        },
        select: () => query,
      }
      return query
    },
  })),
}))

import { readMyDepartureCityAction } from "web/app/(preauth)/onboarding/welcome/welcome-actions"

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key")
})

afterEach(() => {
  vi.unstubAllEnvs()
  state.hasSession = true
  state.moment = null
  state.momentError = null
  state.tables = []
})

describe("cidade de destino das boas-vindas", () => {
  it("sem sessão devolve null e não consulta tabela nenhuma", async () => {
    state.hasSession = false
    await expect(readMyDepartureCityAction()).resolves.toBeNull()
    expect(state.tables).toEqual([])
  })

  it("quem não declarou saída não consulta o catálogo", async () => {
    state.moment = null
    await expect(readMyDepartureCityAction()).resolves.toBeNull()
    expect(state.tables).toEqual(["member_entry_moments"])
  })

  it("moro aqui não tem destino", async () => {
    state.moment = { destination_locality_id: null }
    await expect(readMyDepartureCityAction()).resolves.toBeNull()
    expect(state.tables).toEqual(["member_entry_moments"])
  })

  it("quem está saindo recebe o nome da cidade de destino", async () => {
    state.moment = { destination_locality_id: "00000000-0000-4000-8000-000000000002" }
    await expect(readMyDepartureCityAction()).resolves.toBe("Rio de Janeiro")
    expect(state.tables).toEqual(["member_entry_moments", "localities"])
  })

  it("falha de leitura não vira destino inventado", async () => {
    state.momentError = { message: "boom" }
    await expect(readMyDepartureCityAction()).resolves.toBeNull()
    expect(state.tables).toEqual(["member_entry_moments"])
  })
})
