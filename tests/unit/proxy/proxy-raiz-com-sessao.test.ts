import { CONSENT_VERSION } from "@bivaque/domain"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// F02-001: a tela antiga /inicio saiu do apps/web. O membro com sessão que abre
// "/" vai direto ao Início do app, sem o salto /inicio → /app/inicio; sem aceite
// segue para o onboarding; o anônimo continua recebendo a landing.

const sessao = vi.hoisted(() => ({ usuario: null as { id: string } | null }))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: async () => ({ data: { user: sessao.usuario }, error: null }) },
  })),
}))

type Proxy = (request: NextRequest) => Promise<Response>

async function carregarProxy(): Promise<Proxy> {
  vi.resetModules()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "chave-anonima")
  vi.stubEnv("BIVAQUE_AUTH_BYPASS", "")
  vi.stubEnv("NODE_ENV", "test")
  const modulo = await import("web/proxy")
  return modulo.proxy as Proxy
}

function pedirRaiz(proxy: Proxy, comAceite: boolean): Promise<Response> {
  const headers = comAceite
    ? { cookie: `bivaque-consent-version=${String(CONSENT_VERSION)}` }
    : undefined
  return proxy(new NextRequest("http://localhost:3000/", headers ? { headers } : {}))
}

const destino = (resposta: Response) =>
  new URL(resposta.headers.get("location") ?? "http://localhost/").pathname

describe("raiz do site no proxy", () => {
  let proxy: Proxy

  beforeEach(async () => {
    sessao.usuario = null
    proxy = await carregarProxy()
  })

  it("membro com sessão e aceite vai direto ao Início do app", async () => {
    sessao.usuario = { id: "00000000-0000-4000-8000-000000000001" }
    const resposta = await pedirRaiz(proxy, true)
    expect(resposta.status).toBe(307)
    expect(destino(resposta)).toBe("/app/inicio")
  })

  it("membro com sessão sem aceite segue para o onboarding, não para o Início", async () => {
    sessao.usuario = { id: "00000000-0000-4000-8000-000000000001" }
    const resposta = await pedirRaiz(proxy, false)
    expect(resposta.status).toBe(307)
    expect(destino(resposta)).toBe("/onboarding")
  })

  it("visitante sem sessão recebe a landing, sem redirecionamento", async () => {
    const resposta = await pedirRaiz(proxy, true)
    expect(resposta.headers.get("location")).toBeNull()
    expect(resposta.headers.get("x-middleware-next")).toBe("1")
  })
})
