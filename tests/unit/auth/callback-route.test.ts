import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { signupConsentValue } from "web/lib/auth/signup-intent"

const state = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  exchangeData: { user: { id: "user-1" }, session: { access_token: "token" } } as {
    user: { id: string }
    session: { access_token: string }
    redirectType?: string | null
  },
  exchangeError: null as { message: string } | null,
  consentCalls: 0,
  consentError: null as { message: string } | null,
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
      return { error: state.consentError }
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
  state.consentError = null
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("callback de Auth", () => {
  it("não registra aceite quando a query foi forjada sem intent HttpOnly", async () => {
    const response = await GET(
      new Request(
        "https://app.example/auth/callback?code=valid&next=/auth/confirmar-email&flow=signup-confirmation&consent=2",
      ),
    )

    expect(response.headers.get("location")).toBe("https://app.example/")
    expect(state.consentCalls).toBe(0)
  })

  it("registra o aceite quando o intent server-side acompanha o fluxo", async () => {
    state.cookies.set("bivaque-signup-consent-intent", signupConsentValue("email"))

    const response = await GET(
      new Request(
        "https://app.example/auth/callback?code=valid&next=/auth/confirmar-email&flow=signup-confirmation&consent=2",
      ),
    )

    expect(response.headers.get("location")).toBe("https://app.example/")
    expect(state.consentCalls).toBe(1)
    expect(state.cookies.has("bivaque-signup-consent-intent")).toBe(false)
  })

  it("leva um link de confirmação sem code para o estado expirado", async () => {
    const response = await GET(
      new Request(
        "https://app.example/auth/callback?error=access_denied&next=/auth/confirmar-email",
      ),
    )

    expect(response.headers.get("location")).toBe(
      "https://app.example/auth/confirmar-email?estado=expirado",
    )
  })

  it("leva um link de recuperação sem code para pedir outro", async () => {
    const response = await GET(
      new Request("https://app.example/auth/callback?error=access_denied&next=/nova-senha"),
    )

    expect(response.headers.get("location")).toBe("https://app.example/recuperar-senha?origem=link")
  })

  it("recusa destinos de API e entrada antes de trocar a sessão", async () => {
    const response = await GET(
      new Request("https://app.example/auth/callback?code=valid&next=/api/health"),
    )

    expect(response.headers.get("location")).toBe("https://app.example/auth/callback-error")
    expect(state.consentCalls).toBe(0)
  })

  it("preserva um destino de membro allowlisted com query", async () => {
    const response = await GET(
      new Request("https://app.example/auth/callback?code=valid&next=/events/12%3Ftab%3Dx"),
    )

    expect(response.headers.get("location")).toBe("https://app.example/events/12?tab=x")
  })

  it("leva o magic link do convite de prestador de volta ao convite", async () => {
    // A origem do link é (preauth)/prestador-convite/[token]/acceptance.tsx:
    // emailRedirectTo = /auth/callback?next=/prestador-convite/<token>.
    const response = await GET(
      new Request("https://app.example/auth/callback?code=valid&next=/prestador-convite/tok-9"),
    )

    expect(response.headers.get("location")).toBe("https://app.example/prestador-convite/tok-9")
  })

  it("mantém o intent para retry quando o registro do aceite falha", async () => {
    state.cookies.set("bivaque-signup-consent-intent", signupConsentValue("email"))
    state.consentError = { message: "database unavailable" }

    const response = await GET(
      new Request(
        "https://app.example/auth/callback?code=valid&next=/auth/confirmar-email&flow=signup-confirmation",
      ),
    )

    expect(response.headers.get("location")).toBe(
      "https://app.example/auth/callback-error?motivo=consentimento",
    )
    expect(state.consentCalls).toBe(1)
    expect(state.cookies.has("bivaque-signup-consent-intent")).toBe(true)
  })

  it("não reaproveita o intent de e-mail em um callback Google", async () => {
    state.cookies.set("bivaque-signup-consent-intent", signupConsentValue("email"))

    const response = await GET(
      new Request(
        "https://app.example/auth/callback?code=valid&next=/onboarding&flow=signup-google",
      ),
    )

    expect(response.headers.get("location")).toBe("https://app.example/onboarding")
    expect(state.consentCalls).toBe(0)
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
