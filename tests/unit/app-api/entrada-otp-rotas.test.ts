import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// As rotas da porta: envio e verificação do código. O teste troca os clientes do
// Supabase e prova o que a rota promete — anti-enumeração no envio, mensagem
// única no código inválido, cookies da sessão na resposta e a porta do app.

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }))
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { POST as ENVIAR, OPTIONS as OPTIONS_ENVIO } from "web/app/api/app/entry/otp/route"
import { POST as VERIFICAR } from "web/app/api/app/entry/otp/verify/route"
import { chaveDeLimite } from "web/lib/app-api/entrada-limite"
import { createServerClient as criarClienteDeServico } from "web/lib/supabase/server"

const criarAnonimo = vi.mocked(createClient)
const criarComCookies = vi.mocked(createServerClient)
const criarServico = vi.mocked(criarClienteDeServico)

// O NextRequest normaliza o host do URL para localhost no runner; o que importa
// é a origem do cabeçalho bater com a do request, como no runtime.
const ORIGEM = "http://localhost:3000"
const URL_ENVIO = `${ORIGEM}/app/api/app/entry/otp`
const URL_VERIFICACAO = `${ORIGEM}/app/api/app/entry/otp/verify`
const CABECALHO = { "x-bivaque-app": "bivaque-spa" }

const mockEnviarOtp = vi.fn()
const mockVerificarOtp = vi.fn()
const mockGenerateLink = vi.fn()
const mockRpc = vi.fn()

// Um limitador em memória com a MESMA regra das funções do banco (private.entry_otp_*),
// só para provar a fiação das rotas: quem consome o quê, antes de quem, com qual chave.
// A regra em si é provada no pgTAP (supabase/tests/entry-otp-limiter.sql).
const agora = { segundos: 1_000 }
let ultimoEnvio = new Map<string, number>()
let envioPorHora = new Map<string, number>()
let tentativas = new Map<string, number>()

function limitadorEmMemoria(nome: string, args: Record<string, unknown>) {
  if (nome === "entry_otp_send_gate") {
    const email = String(args["p_email_hash"])
    const ip = args["p_ip_hash"] === undefined ? null : String(args["p_ip_hash"])
    const ultimo = ultimoEnvio.get(email)
    if (ultimo !== undefined && agora.segundos - ultimo < 60) {
      return { data: 60 - (agora.segundos - ultimo), error: null }
    }
    if ((envioPorHora.get(email) ?? 0) >= 6) return { data: 3600, error: null }
    if (ip !== null && (envioPorHora.get(ip) ?? 0) >= 30) return { data: 3600, error: null }
    ultimoEnvio.set(email, agora.segundos)
    envioPorHora.set(email, (envioPorHora.get(email) ?? 0) + 1)
    if (ip !== null) envioPorHora.set(ip, (envioPorHora.get(ip) ?? 0) + 1)
    tentativas.delete(email)
    return { data: 0, error: null }
  }
  const email = String(args["p_email_hash"])
  const feitas = tentativas.get(email) ?? 0
  if (feitas >= 6) return { data: 0, error: null }
  tentativas.set(email, feitas + 1)
  return { data: feitas + 1, error: null }
}

function requisicao(
  url: string,
  metodo: string,
  opcoes: {
    origem?: string
    cabecalho?: boolean
    corpo?: unknown
    extras?: Record<string, string>
  } = {},
) {
  const headers: Record<string, string> = { origin: opcoes.origem ?? ORIGEM, ...opcoes.extras }
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
  vi.stubEnv("NODE_ENV", "test")
  ultimoEnvio = new Map()
  envioPorHora = new Map()
  tentativas = new Map()
  mockRpc.mockImplementation(async (nome: string, args: Record<string, unknown>) =>
    limitadorEmMemoria(nome, args),
  )
  mockGenerateLink.mockResolvedValue({ data: {}, error: null })
  criarServico.mockReturnValue({
    rpc: mockRpc,
    auth: { admin: { generateLink: mockGenerateLink } },
  } as never)
  mockEnviarOtp.mockResolvedValue({ error: null })
  mockVerificarOtp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null })
  criarAnonimo.mockReturnValue({ auth: { signInWithOtp: mockEnviarOtp } } as never)
  criarComCookies.mockImplementation(((_url: string, _chave: string, opcoes: never) => {
    const configuracao = opcoes as unknown as {
      cookies: { setAll: (cookies: readonly unknown[]) => void }
      cookieOptions?: Record<string, unknown>
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
              {
                name: "sb-projeto-auth-token",
                value: "sessao",
                // Como o @supabase/ssr real: as opções do cliente chegam ao setAll.
                options: { ...(configuracao.cookieOptions ?? {}), path: "/" },
              },
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

  it("reenvio antes de 60 s é 429 com os segundos e não chama o GoTrue de novo", async () => {
    const corpo = { email: "a@b.invalid" }
    expect((await ENVIAR(requisicao(URL_ENVIO, "POST", { corpo }))).status).toBe(200)
    agora.segundos += 10

    const reenvio = await ENVIAR(requisicao(URL_ENVIO, "POST", { corpo }))

    expect(reenvio.status).toBe(429)
    expect(await reenvio.json()).toEqual({ erro: "limite", reenviarEm: 50 })
    expect(reenvio.headers.get("retry-after")).toBe("50")
    expect(mockEnviarOtp).toHaveBeenCalledTimes(1)

    agora.segundos += 51
    expect((await ENVIAR(requisicao(URL_ENVIO, "POST", { corpo }))).status).toBe(200)
    expect(mockEnviarOtp).toHaveBeenCalledTimes(2)
  })

  it("inundação de um e-mail esgota o teto dele e não afeta outro e-mail", async () => {
    const inundado = { email: "inundado@example.invalid" }
    for (let envio = 0; envio < 6; envio++) {
      agora.segundos += 61
      expect((await ENVIAR(requisicao(URL_ENVIO, "POST", { corpo: inundado }))).status).toBe(200)
    }
    agora.segundos += 61
    const barrado = await ENVIAR(requisicao(URL_ENVIO, "POST", { corpo: inundado }))
    expect(barrado.status).toBe(429)
    expect(mockEnviarOtp).toHaveBeenCalledTimes(6)

    const outro = await ENVIAR(
      requisicao(URL_ENVIO, "POST", { corpo: { email: "outro@example.invalid" } }),
    )
    expect(outro.status).toBe(200)
    expect(mockEnviarOtp).toHaveBeenCalledTimes(7)
  })

  it("o 429 não depende de a conta existir: mesma resposta para os dois", async () => {
    // O limite vem antes do GoTrue e nem consulta a conta; mesmo que o GoTrue
    // distinguisse "user not found", os dois endereços recebem o mesmo corpo.
    mockEnviarOtp.mockResolvedValue({
      error: { code: "user_not_found", message: "User not found", status: 400 },
    })
    const respostas = []
    for (const email of ["existe@example.invalid", "nao-existe@example.invalid"]) {
      await ENVIAR(requisicao(URL_ENVIO, "POST", { corpo: { email } }))
      agora.segundos += 5
      const limitada = await ENVIAR(requisicao(URL_ENVIO, "POST", { corpo: { email } }))
      respostas.push({ status: limitada.status, corpo: await limitada.json() })
      agora.segundos += 100
    }
    expect(respostas[0]).toEqual(respostas[1])
    expect(respostas[0]?.status).toBe(429)
  })

  it("o limitador recebe HASH do e-mail e do IP confiável, nunca o valor em claro", async () => {
    await ENVIAR(
      requisicao(URL_ENVIO, "POST", {
        corpo: { email: "Pessoa@Example.invalid " },
        extras: { "x-vercel-forwarded-for": "203.0.113.9" },
      }),
    )
    expect(mockRpc).toHaveBeenCalledWith("entry_otp_send_gate", {
      p_email_hash: chaveDeLimite("email", "pessoa@example.invalid"),
      p_ip_hash: chaveDeLimite("ip", "203.0.113.9"),
    })
    expect(JSON.stringify(mockRpc.mock.calls)).not.toMatch(/@|203\.0\.113/)
  })

  it("x-forwarded-for do cliente nunca vira identidade de IP", async () => {
    await ENVIAR(
      requisicao(URL_ENVIO, "POST", {
        corpo: { email: "a@b.invalid" },
        extras: { "x-forwarded-for": "198.51.100.77" },
      }),
    )
    const argumentos = mockRpc.mock.calls[0]?.[1] as Record<string, unknown>
    expect(argumentos["p_ip_hash"]).toBeUndefined()
  })

  it("sem resposta do limitador a rota fecha em 503 e não envia e-mail", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } })
    const resposta = await ENVIAR(
      requisicao(URL_ENVIO, "POST", { corpo: { email: "a@b.invalid" } }),
    )
    expect(resposta.status).toBe(503)
    expect(mockEnviarOtp).not.toHaveBeenCalled()
  })

  it("falta de variável de ambiente responde 503, não 500", async () => {
    criarServico.mockImplementation(() => {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    })
    const semServico = await ENVIAR(
      requisicao(URL_ENVIO, "POST", { corpo: { email: "a@b.invalid" } }),
    )
    expect(semServico.status).toBe(503)
    expect(await semServico.json()).toEqual({ erro: "indisponivel" })

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    const semAnon = await ENVIAR(requisicao(URL_ENVIO, "POST", { corpo: { email: "a@b.invalid" } }))
    expect(semAnon.status).toBe(503)
    expect(mockEnviarOtp).not.toHaveBeenCalled()
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

  it("errado seis vezes invalida o código no servidor; a sétima, com o código certo, falha igual", async () => {
    const invalido = {
      code: "otp_expired",
      message: "Token has expired or is invalid",
      status: 403,
    }
    mockVerificarOtp.mockResolvedValue({ data: { session: null }, error: invalido })
    for (let erro = 1; erro <= 6; erro++) {
      const resposta = await pedido()
      expect(resposta.status).toBe(400)
      expect(await resposta.json()).toEqual({ erro: "codigo-invalido" })
    }
    // O 6º erro troca o token no servidor, sem enviar e-mail.
    expect(mockGenerateLink).toHaveBeenCalledTimes(1)
    expect(mockGenerateLink).toHaveBeenCalledWith({ type: "magiclink", email: "a@b.invalid" })
    expect(mockVerificarOtp).toHaveBeenCalledTimes(6)

    // A pessoa (ou o atacante) acerta o código que valia antes: a rota recusa
    // com a mesma mensagem única, sem nem chegar ao GoTrue.
    mockVerificarOtp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null })
    const setima = await pedido()
    expect(setima.status).toBe(400)
    expect(await setima.json()).toEqual({ erro: "codigo-invalido" })
    expect(setima.headers.get("set-cookie")).toBeNull()
    expect(mockVerificarOtp).toHaveBeenCalledTimes(6)
  })

  it("cinco erros e o código certo ainda entram, e não invalidam nada", async () => {
    mockVerificarOtp.mockResolvedValue({
      data: { session: null },
      error: { code: "invalid_otp", message: "Invalid OTP", status: 400 },
    })
    for (let erro = 1; erro <= 5; erro++) await pedido()
    mockVerificarOtp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null })
    const resposta = await pedido()
    expect(resposta.status).toBe(200)
    expect(mockGenerateLink).not.toHaveBeenCalled()
  })

  it("os erros de um e-mail não bloqueiam a verificação de outro", async () => {
    mockVerificarOtp.mockResolvedValue({
      data: { session: null },
      error: { code: "invalid_otp", message: "Invalid OTP", status: 400 },
    })
    for (let erro = 1; erro <= 7; erro++) await pedido()
    mockVerificarOtp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null })
    const outro = await pedido({ email: "outro@example.invalid", codigo: "123456" })
    expect(outro.status).toBe(200)
  })

  it("um novo envio liberado devolve as seis tentativas", async () => {
    mockVerificarOtp.mockResolvedValue({
      data: { session: null },
      error: { code: "invalid_otp", message: "Invalid OTP", status: 400 },
    })
    for (let erro = 1; erro <= 6; erro++) await pedido()
    agora.segundos += 61
    expect(
      (await ENVIAR(requisicao(URL_ENVIO, "POST", { corpo: { email: "a@b.invalid" } }))).status,
    ).toBe(200)
    mockVerificarOtp.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null })
    expect((await pedido()).status).toBe(200)
  })

  it("sem resposta do limitador a verificação fecha em 503 e não chama o GoTrue", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } })
    const resposta = await pedido()
    expect(resposta.status).toBe(503)
    expect(mockVerificarOtp).not.toHaveBeenCalled()
  })

  it("o cookie da sessão leva Secure em produção e não leva fora dela", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const emProducao = await pedido()
    expect(emProducao.headers.get("set-cookie")).toMatch(/;\s*Secure/i)

    vi.stubEnv("NODE_ENV", "test")
    tentativas = new Map()
    const emTeste = await pedido()
    expect(emTeste.headers.get("set-cookie")).not.toMatch(/Secure/i)
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
