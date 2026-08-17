import { afterEach, describe, expect, it, vi } from "vitest"
import { provisionMember, verifyEligibility } from "web/lib/onboarding/verifyAndProvision"

type VerifySupabase = Parameters<typeof verifyEligibility>[0]

function makeSupabase(attemptAllowed: boolean) {
  const rpc = vi.fn(async (name: string) => {
    if (name === "consume_verification_attempt") {
      return { data: attemptAllowed, error: null }
    }
    if (name === "upsert_verification_outcome") {
      return { data: null, error: null }
    }
    throw new Error(`unexpected rpc: ${name}`)
  })

  const from = vi.fn(() => {
    throw new Error("verify must never touch a table")
  })

  return { rpc, from } as unknown as VerifySupabase
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("verifyEligibility (P0 Task 4)", () => {
  it("validates the Portal key before consuming a verification attempt", async () => {
    vi.stubEnv("PORTAL_DADOS_API_KEY", "")

    const supabase = makeSupabase(true)

    await expect(
      verifyEligibility(supabase, {
        userId: "user-1",
        cpf: "12345678901",
        consentVersion: 1,
      }),
    ).rejects.toThrow("PORTAL_DADOS_API_KEY is required for verification")

    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it("returns a generic pending result without calling the Portal when the limit is exhausted", async () => {
    vi.stubEnv("PORTAL_DADOS_API_KEY", "chave-valida")

    const supabase = makeSupabase(false)

    const result = await verifyEligibility(supabase, {
      userId: "user-1",
      cpf: "12345678901",
      consentVersion: 1,
    })

    expect(result).toEqual({ outcome: { status: "pending" } })
    expect(supabase.rpc).toHaveBeenCalledTimes(1)
    expect(supabase.rpc).toHaveBeenCalledWith("consume_verification_attempt", {
      p_user_id: "user-1",
    })
  })

  it("never writes to locality_memberships or profiles — the task's negative test", async () => {
    // P0 Task 4: eligibility answers "is this person eligible?" and stops.
    // The post-eligibility step asks for the locality; the reconciliation job
    // (D2) reuses verify and therefore never provisions either.
    vi.stubEnv("PORTAL_DADOS_API_KEY", "chave-valida")

    const supabase = makeSupabase(true)

    await verifyEligibility(supabase, {
      userId: "user-1",
      cpf: "12345678901",
      consentVersion: 1,
    })

    // The negative is the test of the task: verify touches no table.
    expect(supabase.from).not.toHaveBeenCalled()
  })
})

describe("provisionMember (P0 Task 4)", () => {
  it("requires a locality — missing locality is an explicit error, never silence", async () => {
    const supabase = {
      rpc: vi.fn(),
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    } as unknown as Parameters<typeof provisionMember>[0]

    await expect(
      provisionMember(supabase, {
        userId: "user-1",
        localityId: "",
        displayName: "Ana",
        consentVersion: 1,
      }),
    ).rejects.toThrow("locality is required to provision a member")
  })
})
