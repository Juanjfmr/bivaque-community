import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// SEC-007 / B-1: a rota que lê a sessão pelo cookie precisa GRAVAR o cookie
// renovado na resposta. O proxy não renova em /api nem em /app (são caminhos
// públicos do portão), então, sem isto, o token renovado vivia só na memória da
// requisição e a sessão morria quando o token de acesso vencia (1 hora).
//
// O `@supabase/ssr` é trocado por um cliente que, como o real, chama `setAll`
// quando renova. Tudo o mais — resolvedor, `exigirSessao`, `responder` — é o
// código de produção.

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }))
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }))

import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { exigirSessao, responder } from "web/lib/app-api/rota-do-app"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const criarComCookies = vi.mocked(createServerClient)
const criarAnonimo = vi.mocked(createClient)

const PESSOA = { id: "10000000-0000-4000-8000-000000000001", email: "pessoa@example.invalid" }
const ORIGEM = "http://localhost:3000"

const mockGetUser = vi.fn()

type ConfiguracaoDoSsr = {
  cookies: { setAll: (cookies: readonly unknown[]) => void }
  cookieOptions?: Record<string, unknown>
}

function requisicao(cabecalhos: Record<string, string> = {}) {
  return new NextRequest(`${ORIGEM}/app/api/app/entry/progress`, {
    method: "GET",
    headers: { origin: ORIGEM, ...cabecalhos },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "chave-anonima")
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  vi.stubEnv("NODE_ENV", "test")
  mockGetUser.mockResolvedValue({ data: { user: PESSOA }, error: null })
  criarComCookies.mockImplementation(((_url: string, _chave: string, opcoes: never) => {
    const configuracao = opcoes as unknown as ConfiguracaoDoSsr
    return {
      auth: {
        getUser: async () => {
          // O token de acesso venceu: o cliente renova e pede para gravar.
          configuracao.cookies.setAll([
            {
              name: "sb-projeto-auth-token",
              value: "sessao-renovada",
              options: { ...(configuracao.cookieOptions ?? {}), path: "/" },
            },
          ])
          return mockGetUser()
        },
      },
    }
  }) as never)
  criarAnonimo.mockReturnValue({ auth: { getUser: mockGetUser } } as never)
})

describe("renovação da sessão por cookie (B-1)", () => {
  it("o cookie renovado vai para a resposta da rota, com Secure em produção", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const entrada = requisicao({ cookie: "sb-projeto-auth-token=sessao-velha" })

    const sessao = await exigirSessao(entrada)
    expect(sessao.ok).toBe(true)
    const resposta = responder(entrada, { autenticado: true }, 200)

    const gravado = resposta.headers.get("set-cookie") ?? ""
    expect(gravado).toContain("sb-projeto-auth-token=sessao-renovada")
    expect(gravado).toMatch(/;\s*Secure/i)
    expect(gravado).toMatch(/;\s*Path=\//i)
    expect(gravado).toMatch(/SameSite=lax/i)
    expect(gravado).toMatch(/Max-Age=34560000/)
  })

  it("fora de produção o cookie não leva Secure (http local continua funcionando)", async () => {
    const entrada = requisicao({ cookie: "sb-projeto-auth-token=sessao-velha" })
    await exigirSessao(entrada)
    const gravado = responder(entrada, {}, 200).headers.get("set-cookie") ?? ""
    expect(gravado).toContain("sb-projeto-auth-token=sessao-renovada")
    expect(gravado).not.toMatch(/Secure/i)
  })

  it("o cookie renovado também sai nas respostas de erro da mesma requisição", async () => {
    // A rotação já consumiu o refresh token antigo: perder o novo por causa de um
    // 400 deixaria a pessoa sem sessão.
    const entrada = requisicao({ cookie: "sb-projeto-auth-token=sessao-velha" })
    await exigirSessao(entrada)
    const erro = responder(entrada, { erro: "corpo-invalido" }, 400)
    expect(erro.status).toBe(400)
    expect(erro.headers.get("set-cookie")).toContain("sessao-renovada")
  })

  it("requisições diferentes não compartilham cookies", async () => {
    const primeira = requisicao({ cookie: "sb-projeto-auth-token=sessao-velha" })
    await exigirSessao(primeira)
    const outra = requisicao()
    expect(responder(outra, {}, 200).headers.get("set-cookie")).toBeNull()
  })

  it("o resolvedor devolve a lista de cookies para gravar", async () => {
    const sessao = await resolverSessaoDaRequisicao(
      requisicao({ cookie: "sb-projeto-auth-token=sessao-velha" }),
    )
    expect(sessao.estado).toBe("autenticada")
    if (sessao.estado !== "autenticada") return
    expect(sessao.cookiesParaGravar).toEqual([
      expect.objectContaining({ name: "sb-projeto-auth-token", value: "sessao-renovada" }),
    ])
  })

  it("sessão por token (app de loja) não grava cookie nenhum", async () => {
    criarComCookies.mockClear()
    const sessao = await resolverSessaoDaRequisicao(
      requisicao({ authorization: "Bearer token-do-app" }),
    )
    expect(sessao.estado).toBe("autenticada")
    if (sessao.estado !== "autenticada") return
    expect(sessao.via).toBe("bearer")
    expect(sessao.cookiesParaGravar).toEqual([])
    expect(criarComCookies).not.toHaveBeenCalled()
  })

  it("sessão recusada não grava cookie e responde 401", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "expirou" } })
    const entrada = requisicao({ cookie: "sb-projeto-auth-token=sessao-velha" })
    const sessao = await exigirSessao(entrada)
    expect(sessao.ok).toBe(false)
    if (sessao.ok) return
    expect(sessao.resposta.status).toBe(401)
    expect(sessao.resposta.headers.get("set-cookie")).toBeNull()
  })

  it("servidor sem a configuração do Supabase é 503, não 401", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    const sessao = await exigirSessao(requisicao({ cookie: "sb-projeto-auth-token=velha" }))
    expect(sessao.ok).toBe(false)
    if (sessao.ok) return
    expect(sessao.resposta.status).toBe(503)
  })
})
