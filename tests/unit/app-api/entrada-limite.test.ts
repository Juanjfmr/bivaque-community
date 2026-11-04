import { describe, expect, it, vi } from "vitest"
import {
  chaveDeLimite,
  consumirEnvio,
  consumirTentativa,
  invalidarCodigo,
  ipConfiavel,
} from "web/lib/app-api/entrada-limite"

// A parte do limitador que é do servidor: quem é o IP, como a chave é feita e o
// que acontece quando o banco responde mal. A regra de contagem é do pgTAP.

describe("chaveDeLimite", () => {
  it("é hash de 64 hex, estável e diferente por escopo e por valor", () => {
    const chave = chaveDeLimite("email", "a@b.invalid")
    expect(chave).toMatch(/^[0-9a-f]{64}$/)
    expect(chaveDeLimite("email", "a@b.invalid")).toBe(chave)
    expect(chaveDeLimite("email", "c@b.invalid")).not.toBe(chave)
    expect(chaveDeLimite("ip", "a@b.invalid")).not.toBe(chave)
    expect(chave).not.toContain("a@b")
  })

  it("o segredo opcional muda a chave (dump do banco não é dicionário de e-mails)", () => {
    const semSegredo = chaveDeLimite("email", "a@b.invalid")
    vi.stubEnv("BIVAQUE_LIMITER_PEPPER", "outro-segredo")
    expect(chaveDeLimite("email", "a@b.invalid")).not.toBe(semSegredo)
    vi.unstubAllEnvs()
  })
})

describe("ipConfiavel", () => {
  const cabecalhos = (valores: Record<string, string>) => new Headers(valores)

  it("lê o cabeçalho que a plataforma escreve", () => {
    expect(ipConfiavel(cabecalhos({ "x-vercel-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9")
    expect(ipConfiavel(cabecalhos({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1")
  })

  it("x-vercel-forwarded-for vence x-real-ip; o primeiro da lista vale", () => {
    expect(
      ipConfiavel(
        cabecalhos({ "x-vercel-forwarded-for": "203.0.113.9, 10.0.0.1", "x-real-ip": "192.0.2.1" }),
      ),
    ).toBe("203.0.113.9")
  })

  it("x-forwarded-for, do cliente, nunca é identidade de IP", () => {
    expect(ipConfiavel(cabecalhos({ "x-forwarded-for": "198.51.100.77" }))).toBeNull()
  })

  it("valor que não parece IP é ignorado", () => {
    expect(ipConfiavel(cabecalhos({ "x-real-ip": "<script>" }))).toBeNull()
    expect(ipConfiavel(cabecalhos({ "x-real-ip": "" }))).toBeNull()
    expect(ipConfiavel(cabecalhos({}))).toBeNull()
  })
})

describe("consumirEnvio e consumirTentativa", () => {
  const clienteComRpc = (resposta: unknown) =>
    ({ rpc: vi.fn(async () => resposta) }) as unknown as Parameters<typeof consumirEnvio>[0]

  it("0 libera, acima de 0 são os segundos de espera", async () => {
    expect(
      await consumirEnvio(clienteComRpc({ data: 0, error: null }), "a@b.invalid", null),
    ).toEqual({ liberado: true })
    expect(
      await consumirEnvio(clienteComRpc({ data: 42, error: null }), "a@b.invalid", "203.0.113.9"),
    ).toEqual({ liberado: false, reenviarEm: 42 })
  })

  it("erro ou resposta fora da forma fecha: indisponível, nunca liberado", async () => {
    expect(
      await consumirEnvio(
        clienteComRpc({ data: null, error: { message: "x" } }),
        "a@b.invalid",
        null,
      ),
    ).toEqual({ indisponivel: true })
    expect(
      await consumirEnvio(clienteComRpc({ data: "0", error: null }), "a@b.invalid", null),
    ).toEqual({ indisponivel: true })
  })

  it("a tentativa devolve o número, 0 no teto e null quando o banco falha", async () => {
    expect(await consumirTentativa(clienteComRpc({ data: 3, error: null }), "a@b.invalid")).toBe(3)
    expect(await consumirTentativa(clienteComRpc({ data: 0, error: null }), "a@b.invalid")).toBe(0)
    expect(
      await consumirTentativa(
        clienteComRpc({ data: null, error: { message: "x" } }),
        "a@b.invalid",
      ),
    ).toBeNull()
  })

  it("invalidar o código usa generateLink (sem enviar e-mail) e informa a falha", async () => {
    const generateLink = vi.fn().mockResolvedValue({ data: {}, error: null })
    const cliente = { auth: { admin: { generateLink } } } as unknown as Parameters<
      typeof invalidarCodigo
    >[0]
    expect(await invalidarCodigo(cliente, "a@b.invalid")).toBe(true)
    expect(generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "a@b.invalid" })

    generateLink.mockResolvedValue({ data: null, error: { message: "falhou" } })
    expect(await invalidarCodigo(cliente, "a@b.invalid")).toBe(false)
  })
})
