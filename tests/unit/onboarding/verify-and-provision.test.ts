import { afterEach, describe, expect, it, vi } from "vitest"
import { verifyAndProvision } from "web/lib/onboarding/verifyAndProvision"

type VerifySupabase = Parameters<typeof verifyAndProvision>[0]

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

  return { rpc } as unknown as VerifySupabase
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("verifyAndProvision", () => {
  it("validates the Portal key before consuming a verification attempt", async () => {
    vi.stubEnv("PORTAL_DADOS_API_KEY", "")

    const supabase = makeSupabase(true)

    await expect(
      verifyAndProvision(supabase, {
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

    const result = await verifyAndProvision(supabase, {
      userId: "user-1",
      cpf: "12345678901",
      consentVersion: 1,
    })

    expect(result).toEqual({
      outcome: { status: "pending" },
      localityMember: false,
      waitlistEntry: false,
    })
    expect(supabase.rpc).toHaveBeenCalledTimes(1)
    expect(supabase.rpc).toHaveBeenCalledWith("consume_verification_attempt", {
      p_user_id: "user-1",
    })
  })
})
