import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  exchangeData: { user: { id: "user-1" }, session: { access_token: "token" } } as {
    user: { id: string }
    session: { access_token: string }
    redirectType?: string | null
  },
  exchangeError: null as { message: string } | null,
  consentCalls: 0,
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = state.cookies.get(name)
      return value === undefined ? undefined : { name, value }
    },
    getAll: () => [...state.cookies].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => {
      state.cookies.set(name, value)
    },
    delete: (nameOrOptions: string | { name: string }) => {
      state.cookies.delete(typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name)
    },
  })),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: vi.fn(async () => ({
        data: state.exchangeData,
        error: state.exchangeError,
      })),
    },
  })),
}))

vi.mock("web/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    rpc: vi.fn(async () => {
      state.consentCalls += 1
      return { error: null }
    }),
  })),
}))

vi.mock("web/lib/logger", () => ({
  log: { error: vi.fn() },
}))

import { GET } from "web/app/auth/callback/route"

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
  state.cookies.clear()
  state.exchangeData = {
    user: { id: "user-1" },
    session: { access_token: "token" },
    redirectType: null,
  }
  state.exchangeError = null
  state.consentCalls = 0
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("callback de Auth", () => {
  it("não registra aceite quando a query foi forjada sem intent HttpOnly", async () => {
    const response = await GET(
      new Request(
        "https://app.example/auth/callback?code=valid&next=/auth/confirmar-email&flow=signup&consent=2",
      ),
    )

    expect(response.headers.get("location")).toBe("https://app.example/")
    expect(state.consentCalls).toBe(0)
  })

  it("registra o aceite quando o intent server-side acompanha o fluxo", async () => {
    state.cookies.set("bivaque-signup-consent-intent", "ready")

    const response = await GET(
      new Request(
        "https://app.example/auth/callback?code=valid&next=/auth/confirmar-email&flow=signup&consent=2",
      ),
    )

    expect(response.headers.get("location")).toBe("https://app.example/")
    expect(state.consentCalls).toBe(1)
    expect(state.cookies.has("bivaque-signup-consent-intent")).toBe(false)
  })

  it("só cria a sessão de recuperação quando o provedor devolveu redirectType recovery", async () => {
    state.exchangeData.redirectType = "recovery"

    const response = await GET(
      new Request("https://app.example/auth/callback?code=valid&next=/nova-senha"),
    )

    expect(response.headers.get("location")).toBe("https://app.example/nova-senha")
    expect(state.cookies.get("bivaque-recovery-intent")).toBe("ready")
  })

  it("uma query de recuperação não substitui o tipo real do provedor", async () => {
    state.exchangeData.redirectType = "signup"

    const response = await GET(
      new Request("https://app.example/auth/callback?code=valid&next=/nova-senha"),
    )

    expect(response.headers.get("location")).toBe("https://app.example/nova-senha")
    expect(state.cookies.has("bivaque-recovery-intent")).toBe(false)
  })
})
