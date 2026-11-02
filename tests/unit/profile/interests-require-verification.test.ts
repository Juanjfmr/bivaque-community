import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// PORT-005, achado P2 da revisão independente: a leitura dos interesses que
// ficou no perfil não exigia verificação. O problema é anterior a esta frente,
// mas o teste que o provava (interest-options-require-verification) saiu junto
// com a action da entrada. Este é o mesmo contrato, agora sobre a action que
// sobreviveu: app/(shell)/profile/interests-actions.ts.
//
// A action lê grupos com service_role, então a sessão sozinha não é permissão.
// Sem admissão, a lista nem é consultada. A cidade vem do vínculo CORRENTE,
// nunca do vínculo de saída.
//
// Segunda correção (desta rodada): admissão é `verified` OU convite familiar
// aceito. O dependente familiar não tem verificação própria (D16) e era
// recusado pela guarda que exigia `verified` da própria pessoa. A regra do
// familiar vem do banco (`has_verified_family_holder`), nunca do cliente.
// Convenção de mock: o teste removido da entrada e profile-affiliation-actions.

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], setAll: () => {} })),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "10000000-0000-4000-8000-000000000001" } } }),
    },
  })),
}))

const state = vi.hoisted(() => ({
  calls: [] as string[],
  familyError: null as { message: string } | null,
  hasCurrentMembership: true,
  hasVerifiedFamilyHolder: false,
  membershipEqs: [] as Array<[string, string]>,
  status: null as string | null,
  statusError: null as { message: string } | null,
  writeArgs: null as Record<string, unknown> | null,
}))

vi.mock("web/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    from: (table: string) => {
      state.calls.push(`from:${table}`)
      const query = {
        select: () => query,
        eq: (column: string, value: string) => {
          if (table === "locality_memberships") state.membershipEqs.push([column, value])
          return query
        },
        limit: () => query,
        maybeSingle: async () => ({
          data: state.hasCurrentMembership
            ? { locality_id: "00000000-0000-4000-8000-000000000001" }
            : null,
          error: null,
        }),
      }
      return query
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      state.calls.push(name)
      if (name === "read_verification_status") {
        return {
          data: state.status === null ? [] : [{ status: state.status }],
          error: state.statusError,
        }
      }
      if (name === "has_verified_family_holder") {
        return { data: state.hasVerifiedFamilyHolder, error: state.familyError }
      }
      if (name === "list_available_groups_for_interests") {
        return {
          data: [{ id: "g-1", name: "Corrida", description: null, visibility: "public" }],
          error: null,
        }
      }
      if (name === "list_user_group_interests") {
        return { data: [], error: null }
      }
      if (name === "record_user_group_interests") {
        state.writeArgs = args
        return { data: null, error: null }
      }
      return { data: null, error: null }
    },
  })),
}))

import {
  clearUserGroupInterestsAction,
  getUserInterestsDataAction,
  recordUserGroupInterestsAction,
} from "web/app/(shell)/profile/interests-actions"

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key")
})

afterEach(() => {
  vi.unstubAllEnvs()
  state.calls = []
  state.familyError = null
  state.hasCurrentMembership = true
  state.hasVerifiedFamilyHolder = false
  state.membershipEqs = []
  state.status = null
  state.statusError = null
  state.writeArgs = null
})

const LIST_RPCS = ["list_available_groups_for_interests", "list_user_group_interests"]

const EXPECTED_GROUPS = {
  available: [{ description: null, id: "g-1", name: "Corrida", visibility: "public" }],
  recorded: [],
}

describe("interesses exigem admissão", () => {
  it.each([null, "pending", "temporary_error", "rejected"])(
    "sem verificação e sem familiar (situação %s), a lista nem é consultada",
    async (status) => {
      state.status = status
      state.hasVerifiedFamilyHolder = false

      await expect(getUserInterestsDataAction()).rejects.toThrow(/Conclua a verificação/)
      for (const rpc of LIST_RPCS) expect(state.calls).not.toContain(rpc)
      expect(state.calls).toContain("has_verified_family_holder")
    },
  )

  it("quem está verificado vê os grupos da cidade, sem consultar o vínculo familiar", async () => {
    state.status = "verified"

    await expect(getUserInterestsDataAction()).resolves.toEqual(EXPECTED_GROUPS)

    for (const rpc of LIST_RPCS) expect(state.calls).toContain(rpc)
    // A verificação própria é a condição mais estreita que já existia para o
    // titular; o familiar só é consultado para quem não é verificado.
    expect(state.calls).not.toContain("has_verified_family_holder")
  })

  it("o familiar admitido consulta os grupos mesmo sem verificação própria", async () => {
    // O convite familiar é a única porta sem CPF (D16): não há linha em
    // verification_outcomes, e é o vínculo com o titular verificado que admite.
    state.status = null
    state.hasVerifiedFamilyHolder = true

    await expect(getUserInterestsDataAction()).resolves.toEqual(EXPECTED_GROUPS)

    expect(state.calls).toContain("read_verification_status")
    expect(state.calls).toContain("has_verified_family_holder")
    for (const rpc of LIST_RPCS) expect(state.calls).toContain(rpc)
  })

  it("falha ao ler a verificação não libera a lista", async () => {
    state.statusError = { message: "boom" }

    await expect(getUserInterestsDataAction()).rejects.toThrow(/Não foi possível/)
    expect(state.calls).toEqual(["read_verification_status"])
    for (const rpc of LIST_RPCS) expect(state.calls).not.toContain(rpc)
  })

  it("falha ao ler o vínculo familiar não libera a lista", async () => {
    // Não conseguir conferir o vínculo não é o mesmo que não ter vínculo.
    state.status = "pending"
    state.hasVerifiedFamilyHolder = true
    state.familyError = { message: "boom" }

    await expect(getUserInterestsDataAction()).rejects.toThrow(/Não foi possível/)
    for (const rpc of LIST_RPCS) expect(state.calls).not.toContain(rpc)
  })

  it("a cidade vem do vínculo corrente, não do vínculo de saída", async () => {
    state.status = "verified"
    state.hasCurrentMembership = false

    // Quem só tem vínculo de saída não recebe sugestão de grupos.
    await expect(getUserInterestsDataAction()).resolves.toBeNull()
    expect(state.membershipEqs).toContainEqual(["kind", "current"])
    for (const rpc of LIST_RPCS) expect(state.calls).not.toContain(rpc)
  })

  it("sem admissão, gravar e limpar interesses também é recusado", async () => {
    state.status = "pending"
    state.hasVerifiedFamilyHolder = false

    const form = new FormData()
    form.append("groupIds", "g-1")

    await expect(recordUserGroupInterestsAction(form)).rejects.toThrow(/Conclua a verificação/)
    await expect(clearUserGroupInterestsAction()).rejects.toThrow(/Conclua a verificação/)
    expect(state.calls).not.toContain("record_user_group_interests")
    expect(state.writeArgs).toBeNull()
  })

  it("verificado grava os interesses com a cidade do vínculo corrente", async () => {
    state.status = "verified"
    const form = new FormData()
    form.append("groupIds", "g-1")

    await recordUserGroupInterestsAction(form)

    expect(state.writeArgs).toEqual({
      p_group_ids: ["g-1"],
      p_locality_id: "00000000-0000-4000-8000-000000000001",
      p_user_id: "10000000-0000-4000-8000-000000000001",
    })
  })

  it("o familiar admitido grava e limpa os interesses", async () => {
    state.status = null
    state.hasVerifiedFamilyHolder = true

    const form = new FormData()
    form.append("groupIds", "g-1")

    await recordUserGroupInterestsAction(form)

    expect(state.writeArgs).toEqual({
      p_group_ids: ["g-1"],
      p_locality_id: "00000000-0000-4000-8000-000000000001",
      p_user_id: "10000000-0000-4000-8000-000000000001",
    })

    state.writeArgs = null
    await clearUserGroupInterestsAction()

    expect(state.writeArgs).toEqual({
      p_group_ids: [],
      p_locality_id: "00000000-0000-4000-8000-000000000001",
      p_user_id: "10000000-0000-4000-8000-000000000001",
    })
  })
})
