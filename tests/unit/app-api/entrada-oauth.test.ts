import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// A porta do Google no app (RUN-002). A rota não fala com o Google: pede a URL
// de autorização ao Supabase e devolve para o app navegar. O teste troca o
// cliente SSR e prova o contrato: origem e cabeçalho do app, só Google, o
// `next` do callback e o PKCE em cookie (nunca na resposta).

const { criarClienteSSR, iniciarOAuth } = vi.hoisted(() => ({
  criarClienteSSR: vi.fn(),
  iniciarOAuth: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({ createServerClient: criarClienteSSR }))
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], set: vi.fn() })),
}))
vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST } from "web/app/api/app/entry/oauth/route"
import { consentStepTarget } from "web/app/auth/callback/redirect-plan"

const ORIGEM = "http://localhost:3000"
const URL_DA_ROTA = `${ORIGEM}/app/api/app/entry/oauth`

function requisicao(opcoes: { origem?: string; cabecalho?: string; corpo?: unknown } = {}) {
  const headers: Record<string, string> = {
    origin: opcoes.origem ?? ORIGEM,
    "content-type": "application/json",
  }
  if (opcoes.cabecalho !== undefined) headers["x-bivaque-app"] = opcoes.cabecalho
  return new NextRequest(URL_DA_ROTA, {
    method: "POST",
    headers,
    body: JSON.stringify(opcoes.corpo ?? { provedor: "google" }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:55321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-de-teste")
  criarClienteSSR.mockReturnValue({ auth: { signInWithOAuth: iniciarOAuth } })
  iniciarOAuth.mockResolvedValue({
    data: { url: "https://accounts.google.com/o/oauth2/auth?client_id=x" },
    error: null,
  })
})

describe("POST /api/app/entry/oauth", () => {
  it("recusa origem fora da lista antes de falar com o Supabase", async () => {
    const resposta = await POST(
      requisicao({ origem: "https://mal.example", cabecalho: "bivaque-spa" }),
    )

    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "origem-recusada" })
    expect(criarClienteSSR).not.toHaveBeenCalled()
  })

  it("recusa sem o cabeçalho do app", async () => {
    const resposta = await POST(requisicao({ cabecalho: undefined }))

    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "cabecalho-ausente" })
    expect(iniciarOAuth).not.toHaveBeenCalled()
  })

  it("só começa o provedor Google", async () => {
    const resposta = await POST(
      requisicao({ cabecalho: "bivaque-spa", corpo: { provedor: "apple" } }),
    )

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: "provedor-invalido" })
    expect(iniciarOAuth).not.toHaveBeenCalled()
  })

  it("devolve a URL e manda o callback de volta para a entrada do app", async () => {
    const resposta = await POST(requisicao({ cabecalho: "bivaque-spa" }))
    const corpo = (await resposta.json()) as { url: string }

    expect(resposta.status).toBe(200)
    expect(corpo.url).toContain("accounts.google.com")
    expect(iniciarOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: `${ORIGEM}/auth/callback?next=%2Fapp%2Fentrar`,
        skipBrowserRedirect: true,
      },
    })
  })

  it("responde 503 quando o Supabase não devolve URL", async () => {
    iniciarOAuth.mockResolvedValue({ data: { url: null }, error: new Error("provider off") })

    const resposta = await POST(requisicao({ cabecalho: "bivaque-spa" }))

    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "oauth-indisponivel" })
  })

  it("responde 503 sem configuração do Supabase", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")

    const resposta = await POST(requisicao({ cabecalho: "bivaque-spa" }))

    expect(resposta.status).toBe(503)
    expect(criarClienteSSR).not.toHaveBeenCalled()
  })
})

describe("consentStepTarget no callback", () => {
  it("não desvia para o /consent da web quando o destino é a entrada do app", () => {
    expect(consentStepTarget(false, "/app/entrar")).toBeNull()
  })

  it("continua desviando os destinos da web sem aceite", () => {
    expect(consentStepTarget(false, "/onboarding")).toBe("/consent")
  })
})
