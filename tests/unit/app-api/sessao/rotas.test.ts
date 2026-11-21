import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/limitador-de-sessao", () => ({ consumirSessaoNativa: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn(() => ({})) }))

import { OPTIONS as opcoesRenovar, POST as renovar } from "web/app/api/app/sessao/renovar/route"
import { OPTIONS as opcoesToken, POST as token } from "web/app/api/app/sessao/token/route"
import { consumirSessaoNativa } from "web/lib/app-api/limitador-de-sessao"

const limite = vi.mocked(consumirSessaoNativa)
const chamada = vi.fn()
const rotas = [
  {
    nome: "token",
    post: token,
    options: opcoesToken,
    corpo: { code: "codigo-sintetico", code_verifier: "a".repeat(43) },
  },
  {
    nome: "renovar",
    post: renovar,
    options: opcoesRenovar,
    corpo: { refresh_token: "renovacao-sintetica" },
  },
] as const

function pedido(nome: string, corpo: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000/api/app/sessao/${nome}`, {
    method: "POST",
    headers: {
      origin: "https://localhost",
      "x-bivaque-cliente": "loja",
      "x-bivaque-app": "bivaque-spa",
      ...headers,
    },
    body: JSON.stringify(corpo),
  })
}

describe.each(rotas)("sessao/$nome", ({ nome, post, options, corpo }) => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-sintetico")
    vi.stubGlobal("fetch", chamada)
    limite.mockResolvedValue("liberado")
    chamada.mockResolvedValue(
      Response.json({
        access_token: "acesso",
        refresh_token: "renovacao",
        expires_at: 100,
        user: {},
        provider_token: "privado",
      }),
    )
  })
  it("recusa modo, origens, cookie e cabeçalho inválidos antes do limitador", async () => {
    for (const headers of [
      { "x-bivaque-cliente": "web" },
      { origin: "http://localhost:3000" },
      { origin: "null" },
      { cookie: "sb-projeto-auth-token=valor" },
      { "x-bivaque-app": "" },
    ]) {
      const resposta = await post(pedido(nome, corpo, headers))
      expect(resposta.status).toBe(headers.cookie ? 400 : 403)
    }
    expect(limite).not.toHaveBeenCalled()
  })
  it("valida corpo e limite antes do GoTrue, inclusive sem IP", async () => {
    expect((await post(pedido(nome, {}))).status).toBe(400)
    limite.mockResolvedValueOnce("estourou").mockResolvedValueOnce("indisponivel")
    expect((await post(pedido(nome, corpo))).status).toBe(429)
    expect(limite).toHaveBeenCalledWith(expect.anything(), nome, null)
    expect((await post(pedido(nome, corpo))).status).toBe(503)
    expect(chamada).not.toHaveBeenCalled()
  })
  it("devolve somente o par e permite preflight nativo", async () => {
    const resposta = await post(pedido(nome, corpo))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      access_token: "acesso",
      refresh_token: "renovacao",
      expires_at: 100,
    })
    expect(resposta.headers.get("set-cookie")).toBeNull()
    expect(resposta.headers.get("cache-control")).toBe("no-store")
    const preflight = options(
      new NextRequest(`http://localhost/api/app/sessao/${nome}`, {
        method: "OPTIONS",
        headers: { origin: "https://localhost" },
      }),
    )
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get("access-control-allow-origin")).toBe("https://localhost")
    expect(preflight.headers.get("access-control-allow-credentials")).toBeNull()
  })
  it("calcula expiração quando GoTrue só fornece expires_in", async () => {
    chamada.mockResolvedValueOnce(
      Response.json({ access_token: "a", refresh_token: "r", expires_in: 60 }),
    )
    const antes = Math.floor(Date.now() / 1000)
    const dados = await (await post(pedido(nome, corpo))).json()
    expect(dados.expires_at).toBeGreaterThanOrEqual(antes + 60)
  })
  it.each([
    "refresh_token_not_found",
    "refresh_token_already_used",
    "session_not_found",
    "session_expired",
    "bad_code_verifier",
    "flow_state_not_found",
    "flow_state_expired",
    "invalid_grant",
    "user_not_found",
    "user_banned",
  ])("recusa credencial pelo código %s", async (codigo) => {
    for (const campo of ["error_code", "error"]) {
      chamada.mockResolvedValueOnce(Response.json({ [campo]: codigo }, { status: 400 }))
      expect((await post(pedido(nome, corpo))).status).toBe(401)
    }
  })
  it.each([400, 401, 403, 404, 422])(
    "trata erro desconhecido %s como indisponibilidade",
    async (status) => {
      chamada.mockResolvedValueOnce(Response.json({ error: "invalid_api_key" }, { status }))
      expect((await post(pedido(nome, corpo))).status).toBe(503)
      chamada.mockResolvedValueOnce(new Response(null, { status }))
      expect((await post(pedido(nome, corpo))).status).toBe(503)
    },
  )
  it.each([429, 500, 503])("trata falha transitória %s como 503", async (status) => {
    chamada.mockResolvedValueOnce(new Response(null, { status }))
    expect((await post(pedido(nome, corpo))).status).toBe(503)
  })
  it("nao registra token nem corpo do GoTrue nos logs de falha", async () => {
    const token = "refresh-token-super-secreto"
    const erro = vi.spyOn(console, "error").mockImplementation(() => {})
    chamada.mockResolvedValueOnce(Response.json({ message: token }, { status: 503 }))
    expect((await post(pedido(nome, corpo))).status).toBe(503)
    chamada.mockRejectedValueOnce(new Error(token))
    expect((await post(pedido(nome, corpo))).status).toBe(503)
    expect(erro.mock.calls.flat().join(" ")).not.toContain(token)
    erro.mockRestore()
  })

  it("trata timeout, rede e resposta incompleta como indisponibilidade", async () => {
    chamada
      .mockRejectedValueOnce(new DOMException("timeout", "TimeoutError"))
      .mockRejectedValueOnce(new Error("rede"))
      .mockResolvedValueOnce(Response.json({ access_token: "a", refresh_token: "r" }))
    for (let i = 0; i < 3; i++) expect((await post(pedido(nome, corpo))).status).toBe(503)
  })
})

it("recusa verificador PKCE inválido antes do limitador", async () => {
  vi.clearAllMocks()
  expect((await token(pedido("token", { code: "codigo", code_verifier: "curto" }))).status).toBe(
    400,
  )
  expect(limite).not.toHaveBeenCalled()
})

it("envia o verificador PKCE e recusa verificador errado ou código reutilizado", async () => {
  limite.mockResolvedValue("liberado")
  vi.stubGlobal("fetch", chamada)
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-sintetico")
  chamada.mockImplementation(() =>
    Promise.resolve(Response.json({ error_code: "bad_code_verifier" }, { status: 400 })),
  )
  const corpo = { code: "codigo-sintetico", code_verifier: "a".repeat(43) }
  for (let i = 0; i < 2; i++) {
    expect((await token(pedido("token", corpo))).status).toBe(401)
  }
  expect(chamada).toHaveBeenCalledWith(
    "http://localhost:54321/auth/v1/token?grant_type=pkce",
    expect.objectContaining({
      body: JSON.stringify({ auth_code: corpo.code, code_verifier: corpo.code_verifier }),
    }),
  )
})
