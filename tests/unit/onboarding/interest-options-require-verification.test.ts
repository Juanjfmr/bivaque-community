// Auditoria de 22/09/2026, achado MEDIUM: loadInterestOptionsAction lia os grupos de
// qualquer cidade com service_role, conferindo só a sessão. Agora só quem está verificado
// vê as opções; o resto recebe erro e a lista de grupos nem é consultada.
// Convenção de mock: profile-affiliation-actions.test.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], setAll: () => {} })),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "10000000-0000-4000-8000-000000000001" } } }),
    },
  })),
}))

const state = vi.hoisted(() => ({
  status: null as string | null,
  statusError: null as unknown,
  calls: [] as string[],
}))

vi.mock("web/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    rpc: async (name: string) => {
      state.calls.push(name)
      if (name === "read_verification_status") {
        return {
          data: state.status === null ? [] : [{ status: state.status }],
          error: state.statusError,
        }
      }
      return { data: [{ id: "g-1", name: "Corrida", already_interest: false }], error: null }
    },
  })),
}))

import { loadInterestOptionsAction } from "web/app/(preauth)/onboarding/perfil/perfil-actions"

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key")
})

afterEach(() => {
  vi.unstubAllEnvs()
  state.status = null
  state.statusError = null
  state.calls = []
})

const LOCALITY = "00000000-0000-4000-8000-000000000001"

describe("opções de interesse exigem verificação", () => {
  it.each([null, "pending", "temporary_error", "rejected"])(
    "situação %s não vê grupos, e a lista nem é consultada",
    async (status) => {
      state.status = status
      await expect(loadInterestOptionsAction(LOCALITY)).rejects.toThrow(/Conclua a verificação/)
      expect(state.calls).toEqual(["read_verification_status"])
    },
  )

  it("quem está verificado vê os grupos da cidade", async () => {
    state.status = "verified"
    await expect(loadInterestOptionsAction(LOCALITY)).resolves.toEqual([
      { id: "g-1", name: "Corrida", alreadyInterest: false },
    ])
  })

  it("falha ao ler a verificação não libera a lista", async () => {
    state.statusError = { message: "boom" }
    await expect(loadInterestOptionsAction(LOCALITY)).rejects.toThrow(/Não foi possível/)
    expect(state.calls).toEqual(["read_verification_status"])
  })
})
