import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}))

describe("CSP no proxy", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anonima")
    vi.stubEnv("BIVAQUE_AUTH_BYPASS", "")
  })

  it("substitui cabecalhos enviados pelo cliente e gera nonce novo", async () => {
    const { proxy } = await import("web/proxy")
    const pedido = () =>
      new NextRequest("http://localhost:3000/privacidade", {
        headers: { "x-nonce": "atacante", "Content-Security-Policy": "atacante" },
      })
    const primeira = await proxy(pedido())
    const segunda = await proxy(pedido())
    const csp = primeira.headers.get("content-security-policy")
    expect(csp).toContain("'nonce-")
    expect(csp).not.toContain("atacante")
    expect(primeira.headers.get("x-nonce")).not.toBe("atacante")
    expect(primeira.headers.get("x-middleware-request-x-nonce")).not.toBe("atacante")
    expect(primeira.headers.get("x-middleware-request-content-security-policy")).toBe(csp)
    expect(segunda.headers.get("content-security-policy")).not.toBe(csp)
  })

  it("protege o redirecionamento com nonce", async () => {
    const { proxy } = await import("web/proxy")
    const resposta = await proxy(new NextRequest("http://localhost:3000/rota-protegida"))
    expect(resposta.status).toBe(307)
    expect(resposta.headers.get("content-security-policy")).toContain("'nonce-")
  })

  it.each(["/app/inicio", "/api/inexistente"])("nao aplica nonce a %s", async (caminho) => {
    const { proxy } = await import("web/proxy")
    const resposta = await proxy(new NextRequest(`http://localhost:3000${caminho}`))
    expect(resposta.headers.get("content-security-policy")).toBeNull()
  })
})
