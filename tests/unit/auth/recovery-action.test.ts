import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  updateCalls: 0,
  updateError: null as { message: string } | null,
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: () => (state.cookie === undefined ? undefined : { value: state.cookie }),
    getAll: () => [],
    set: () => {},
    delete: () => {
      state.cookie = undefined
    },
  })),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      updateUser: vi.fn(async () => {
        state.updateCalls += 1
        return { error: state.updateError }
      }),
    },
  })),
}))

import { updatePasswordFromRecoveryAction } from "web/app/(preauth)/nova-senha/actions"

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
  state.cookie = undefined
  state.updateCalls = 0
  state.updateError = null
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("action de recuperação", () => {
  it("recusa uma sessão comum sem intent", async () => {
    const result = await updatePasswordFromRecoveryAction("senha-forte-123")

    expect(result).toEqual({ ok: false, reason: "expired" })
    expect(state.updateCalls).toBe(0)
  })

  it("recusa senha inválida antes de tocar no provedor", async () => {
    state.cookie = "ready"

    const result = await updatePasswordFromRecoveryAction("abc123")

    expect(result).toEqual({ ok: false, reason: "invalid" })
    expect(state.updateCalls).toBe(0)
  })

  it("consome o intent e salva a senha quando o provedor confirma", async () => {
    state.cookie = "ready"

    const result = await updatePasswordFromRecoveryAction("senha-forte-123")

    expect(result).toEqual({ ok: true })
    expect(state.updateCalls).toBe(1)
    expect(state.cookie).toBeUndefined()
  })
})
