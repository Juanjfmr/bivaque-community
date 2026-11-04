import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// As rotas da porta: envio e verificação do código. O teste troca os clientes do
// Supabase e prova o que a rota promete — anti-enumeração no envio, mensagem
// única no código inválido, cookies da sessão na resposta e a porta do app.

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }))
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }))

import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { POST as ENVIAR, OPTIONS as OPTIONS_ENVIO } from "web/app/api/app/entry/otp/route"
import { POST as VERIFICAR } from "web/app/api/app/entry/otp/verify/route"

const criarAnonimo = vi.mocked(createClient)
const criarComCookies = vi.mocked(createServerClient)

// O NextRequest normaliza o host do URL para localhost no runner; o que importa
// é a origem do cabeçalho bater com a do request, como no runtime.
const ORIGEM = "http://localhost:3000"
const URL_ENVIO = `${ORIGEM}/app/api/app/entry/otp`
const URL_VERIFICACAO = `${ORIGEM}/app/api/app/entry/otp/verify`
const CABECALHO = { "x-bivaque-app": "bivaque-spa" }

const mockEnviarOtp = vi.fn()
const mockVerificarOtp = vi.fn()

function requisicao(
  url: string,
  metodo: string,
  opcoes: { origem?: string; cabecalho?: boolean; corpo?: unknown } = {},
) {
  const headers: Record<string, string> = { origin: opcoes.origem ?? ORIGEM }
  if (opcoes.cabecalho !== false) Object.assign(headers, CABECALHO)
  if (metodo !== "OPTIONS") headers["content-type"] = "application/json"
  return new NextRequest(url, {
    method: metodo,
    headers,
    ...(metodo === "OPTIONS" ? {} : { body: JSON.stringify(opcoes.corpo ?? {}) }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "chave-anonima")
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  mockEnviarOtp.mockResolvedValue({ error: null })
  mockVerificarOtp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null })
  criarAnonimo.mockReturnValue({ auth: { signInWithOtp: mockEnviarOtp } } as never)
  criarComCookies.mockImplementation(((_url: string, _chave: string, opcoes: never) => {
    const configuracao = opcoes as unknown as {
      cookies: { setAll: (cookies: readonly unknown[]) => void }
    }
    return {
      auth: {
        verifyOtp: async (entrada: unknown) => {
          const resultado = (await mockVerificarOtp(entrada)) as {
            data: { session: unknown }
            error: unknown
          }
          if (resultado.error === null) {
            configuracao.cookies.setAll([
              { name: "sb-projeto-auth-token", value: "sessao", options: { path: "/" } },
            ])
          }
          return resultado
        },
      },
    }
  }) as never)
})

describe("POST /api/app/entry/otp (envio)", () => {
  it("exige o cabeçalho do app", async () => {
    const resposta = await ENVIAR(
      requisicao(URL_ENVIO, "POST", { cabecalho: false, corpo: { email: "a@b.invalid" } }),
    )
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "cabecalho-ausente" })
    expect(mockEnviarOtp).not.toHaveBeenCalled()
  })

  it("recusa origem fora da lista", async () => {
    const resposta = await ENVIAR(
      requisicao(URL_ENVIO, "POST", {
        origem: "https://evil.example.invalid",
        corpo: { email: "a@b.invalid" },
      }),
    )
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "origem-recusada" })
  })

  it("recusa e-mail sem cara de endereço antes de falar com o GoTrue", async () => {
    const resposta = await ENVIAR(requisicao(URL_ENVIO, "POST", { corpo: { email: "x" } }))
    expect(resposta.status).toBe(400)
    expect(mockEnviarOtp).not.toHaveBeenCalled()
  })

  it("conta nova e conta existente recebem a MESMA resposta", async () => {
    const novo = await ENVIAR(
      requisicao(URL_ENVIO, "POST", { corpo: { email: "novo@example.invalid" } }),
    )
    expect(novo.status).toBe(200)
    const corpoNovo = await novo.json()
    expect(corpoNovo).toEqual({ enviado: true, reenviarEm: 60 })

    mockEnviarOtp.mockResolvedValue({
      error: { code: "user_not_found", message: "User not found", status: 400 },
    })
    const existente = await ENVIAR(
      requisicao(URL_ENVIO, "POST", { corpo: { email: "antigo@example.invalid" } }),
    )
    expect(existente.status).toBe(200)
    expect(await existente.json()).toEqual(corpoNovo)
  })

  it("limite de reenvio vira 429 com os segundos", async () => {
    mockEnviarOtp.mockResolvedValue({
      error: { code: "over_email_send_rate_limit", message: "after 47 seconds", status: 429 },
    })
    const resposta = await ENVIAR(
      requisicao(URL_ENVIO, "POST", { corpo: { email: "a@b.invalid" } }),
    )
    expect(resposta.status).toBe(429)
    expect(await resposta.json()).toEqual({ erro: "limite", reenviarEm: 47 })
  })

  it("falha de transporte vira 503, nunca enviado", async () => {
    mockEnviarOtp.mockResolvedValue({ error: { name: "TypeError", message: "Failed to fetch" } })
    const resposta = await ENVIAR(
      requisicao(URL_ENVIO, "POST", { corpo: { email: "a@b.invalid" } }),
    )
    expect(resposta.status).toBe(503)
  })

  it("preflight só para origem da lista", () => {
    expect(OPTIONS_ENVIO(requisicao(URL_ENVIO, "OPTIONS")).status).toBe(204)
    expect(
      OPTIONS_ENVIO(requisicao(URL_ENVIO, "OPTIONS", { origem: "https://evil.example.invalid" }))
        .status,
    ).toBe(403)
  })
})

describe("POST /api/app/entry/otp/verify", () => {
  const pedido = (corpo: unknown = { email: "a@b.invalid", codigo: "123456" }, opcoes = {}) =>
    VERIFICAR(requisicao(URL_VERIFICACAO, "POST", { corpo, ...opcoes }))

  it("exige o cabeçalho do app e origem da lista", async () => {
    expect((await pedido(undefined, { cabecalho: false })).status).toBe(403)
    expect((await pedido(undefined, { origem: "https://evil.example.invalid" })).status).toBe(403)
    expect(mockVerificarOtp).not.toHaveBeenCalled()
  })

  it("forma inválida do pedido vira 400 com a mensagem única", async () => {
    expect((await pedido({ email: "x", codigo: "123456" })).status).toBe(400)
    expect((await pedido({ email: "a@b.invalid", codigo: "12" })).status).toBe(400)
    expect(mockVerificarOtp).not.toHaveBeenCalled()
  })

  it("código errado, vencido ou reusado respondem a mesma mensagem", async () => {
    for (const error of [
      { code: "otp_expired", message: "Token has expired or is invalid", status: 403 },
      { code: "invalid_otp", message: "Invalid OTP", status: 400 },
    ]) {
      mockVerificarOtp.mockResolvedValue({ data: { session: null }, error })
      const resposta = await pedido()
      expect(resposta.status).toBe(400)
      expect(await resposta.json()).toEqual({ erro: "codigo-invalido" })
    }
  })

  it("código válido autentica e grava o cookie da sessão na resposta", async () => {
    const resposta = await pedido()
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ autenticado: true })
    expect(resposta.headers.get("set-cookie")).toContain("sb-projeto-auth-token")
    expect(mockVerificarOtp).toHaveBeenCalledWith({
      email: "a@b.invalid",
      token: "123456",
      type: "email",
    })
  })

  it("validação sem sessão não finge entrada", async () => {
    mockVerificarOtp.mockResolvedValue({ data: { session: null }, error: null })
    const resposta = await pedido()
    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: "codigo-invalido" })
  })

  it("limite do GoTrue vira 429 e falha desconhecida vira 503", async () => {
    mockVerificarOtp.mockResolvedValue({
      data: { session: null },
      error: { code: "over_request_rate_limit", status: 429 },
    })
    expect((await pedido()).status).toBe(429)

    mockVerificarOtp.mockResolvedValue({
      data: { session: null },
      error: { code: "unexpected_failure", status: 500 },
    })
    expect((await pedido()).status).toBe(503)
  })
})
