import { afterEach, describe, expect, it, vi } from "vitest"
import {
  chaveDeLimite,
  confirmarEnvio,
  consumirEnvio,
  consumirTentativa,
  invalidarCodigo,
  ipConfiavel,
  limitadorConfigurado,
  normalizarIp,
} from "web/lib/app-api/entrada-limite"

// A parte do limitador que é do servidor: quem é o IP, como a chave é feita e o
// que acontece quando o banco responde mal. A regra de contagem é do pgTAP.

afterEach(() => vi.unstubAllEnvs())

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
  })

  it("em produção não existe segredo padrão: sem ele (ausente, vazio ou só espaço) lança", () => {
    vi.stubEnv("NODE_ENV", "production")
    for (const valor of ["", "   "]) {
      vi.stubEnv("BIVAQUE_LIMITER_PEPPER", valor)
      expect(limitadorConfigurado()).toBe(false)
      expect(() => chaveDeLimite("email", "a@b.invalid")).toThrow(/BIVAQUE_LIMITER_PEPPER/)
    }
    vi.stubEnv("BIVAQUE_LIMITER_PEPPER", "segredo-de-teste-da-producao")
    expect(limitadorConfigurado()).toBe(true)
    expect(chaveDeLimite("email", "a@b.invalid")).toMatch(/^[0-9a-f]{64}$/)
  })

  it("fora de produção o segredo de desenvolvimento serve, e o valor de produção o muda", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("BIVAQUE_LIMITER_PEPPER", "")
    expect(limitadorConfigurado()).toBe(true)
    const emDesenvolvimento = chaveDeLimite("email", "a@b.invalid")
    vi.stubEnv("BIVAQUE_LIMITER_PEPPER", "segredo-de-teste-da-producao")
    expect(chaveDeLimite("email", "a@b.invalid")).not.toBe(emDesenvolvimento)
  })

  it("IPv6 do mesmo /64 dá a mesma chave de IP; /64 diferente, não; e-mail não é normalizado", () => {
    const base = chaveDeLimite("ip", "2001:db8:1:2:aaaa:bbbb:cccc:dddd")
    expect(chaveDeLimite("ip", "2001:db8:1:2:1111:2222:3333:4444")).toBe(base)
    expect(chaveDeLimite("ip", "2001:DB8:1:2::1")).toBe(base)
    expect(chaveDeLimite("ip", "2001:db8:1:3::1")).not.toBe(base)
    expect(chaveDeLimite("ip", "203.0.113.9")).not.toBe(chaveDeLimite("ip", "203.0.113.10"))
  })
})

describe("normalizarIp", () => {
  it("reduz IPv6 ao /64 canônico, sem zeros à esquerda e em minúsculas", () => {
    expect(normalizarIp("2001:0DB8:0000:0001:ffff:eeee:dddd:cccc")).toBe("2001:db8:0:1::/64")
    expect(normalizarIp("2001:db8::1")).toBe("2001:db8:0:0::/64")
    expect(normalizarIp("::1")).toBe("0:0:0:0::/64")
    expect(normalizarIp("2001:db8:1:2:3:4:5:6")).toBe("2001:db8:1:2::/64")
    expect(normalizarIp("fe80::1%eth0")).toBe("fe80:0:0:0::/64")
  })

  it("deixa o IPv4 como veio e converte IPv4 embutido em IPv6", () => {
    expect(normalizarIp("203.0.113.9")).toBe("203.0.113.9")
    expect(normalizarIp("::ffff:203.0.113.9")).toBe("203.0.113.9")
    expect(normalizarIp("::ffff:cb00:7109")).toBe("203.0.113.9")
  })

  it("o mesmo prefixo com grafias diferentes cai no mesmo valor", () => {
    expect(normalizarIp("2001:db8:0:1:0:0:0:1")).toBe(normalizarIp("2001:db8:0:1::ffff"))
    expect(normalizarIp("2001:db8::1:0:0:1")).not.toBe(normalizarIp("2001:db8:1::1"))
  })

  it("valor que não é IP volta intacto", () => {
    expect(normalizarIp("quem@example.invalid")).toBe("quem@example.invalid")
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
    expect(ipConfiavel(cabecalhos({ "x-real-ip": "dead:beef" }))).toBeNull()
    expect(ipConfiavel(cabecalhos({ "x-real-ip": "999.1.1.1" }))).toBeNull()
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

  it("a tentativa devolve o número, esgotado, limite do IP e indisponível", async () => {
    expect(
      await consumirTentativa(clienteComRpc({ data: 3, error: null }), "a@b.invalid", null),
    ).toEqual({
      tentativa: 3,
    })
    expect(
      await consumirTentativa(clienteComRpc({ data: 0, error: null }), "a@b.invalid", null),
    ).toEqual({
      esgotado: true,
    })
    expect(
      await consumirTentativa(
        clienteComRpc({ data: -240, error: null }),
        "a@b.invalid",
        "203.0.113.9",
      ),
    ).toEqual({ limiteDoIp: 240 })
    expect(
      await consumirTentativa(
        clienteComRpc({ data: null, error: { message: "x" } }),
        "a@b.invalid",
        null,
      ),
    ).toEqual({ indisponivel: true })
    expect(
      await consumirTentativa(clienteComRpc({ data: "3", error: null }), "a@b.invalid", null),
    ).toEqual({ indisponivel: true })
  })

  it("a verificação manda o hash do IP junto (e só o hash), e omite quando não há IP", async () => {
    const rpc = vi.fn(async () => ({ data: 1, error: null }))
    const cliente = { rpc } as unknown as Parameters<typeof consumirTentativa>[0]
    await consumirTentativa(cliente, "a@b.invalid", "2001:db8:1:2:3:4:5:6")
    await consumirTentativa(cliente, "a@b.invalid", null)
    expect(rpc).toHaveBeenNthCalledWith(1, "entry_otp_verify_attempt", {
      p_email_hash: chaveDeLimite("email", "a@b.invalid"),
      p_max: 6,
      p_ip_hash: chaveDeLimite("ip", "2001:db8:1:2::"),
    })
    expect(rpc).toHaveBeenNthCalledWith(2, "entry_otp_verify_attempt", {
      p_email_hash: chaveDeLimite("email", "a@b.invalid"),
      p_max: 6,
    })
    expect(JSON.stringify(rpc.mock.calls)).not.toMatch(/@|2001:db8/)
  })

  it("confirmar o envio manda só o hash do e-mail e informa a falha do banco", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }))
    const cliente = { rpc } as unknown as Parameters<typeof confirmarEnvio>[0]
    expect(await confirmarEnvio(cliente, "a@b.invalid")).toBe(true)
    expect(rpc).toHaveBeenCalledWith("entry_otp_send_confirmed", {
      p_email_hash: chaveDeLimite("email", "a@b.invalid"),
    })
    expect(
      await confirmarEnvio(clienteComRpc({ data: null, error: { message: "x" } }), "a@b.invalid"),
    ).toBe(false)
  })

  describe("invalidarCodigo: o tipo de link vem do estado da conta", () => {
    const clienteDaConta = (
      estado: unknown,
      generateLink = vi.fn().mockResolvedValue({ error: null }),
    ) => ({
      generateLink,
      cliente: {
        rpc: vi.fn(async () => ({ data: estado, error: null })),
        auth: { admin: { generateLink } },
      } as unknown as Parameters<typeof invalidarCodigo>[0],
    })

    it("conta confirmada usa magiclink", async () => {
      const { cliente, generateLink } = clienteDaConta("confirmed")
      expect(await invalidarCodigo(cliente, "a@b.invalid")).toBe(true)
      expect(generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "a@b.invalid" })
    })

    it("conta ainda não confirmada usa invite, que troca o token de confirmação", async () => {
      const { cliente, generateLink } = clienteDaConta("unconfirmed")
      expect(await invalidarCodigo(cliente, "a@b.invalid")).toBe(true)
      expect(generateLink).toHaveBeenCalledWith({ type: "invite", email: "a@b.invalid" })
    })

    it("e-mail sem conta não chama o GoTrue: nada para invalidar, nenhuma conta criada", async () => {
      const { cliente, generateLink } = clienteDaConta("none")
      expect(await invalidarCodigo(cliente, "a@b.invalid")).toBe(true)
      expect(generateLink).not.toHaveBeenCalled()
    })

    it("estado ilegível ou erro do banco informa falha e não chama o GoTrue", async () => {
      const inesperado = clienteDaConta("outra-coisa")
      expect(await invalidarCodigo(inesperado.cliente, "a@b.invalid")).toBe(false)
      expect(inesperado.generateLink).not.toHaveBeenCalled()

      const generateLink = vi.fn()
      const comErro = {
        rpc: vi.fn(async () => ({ data: null, error: { message: "x" } })),
        auth: { admin: { generateLink } },
      } as unknown as Parameters<typeof invalidarCodigo>[0]
      expect(await invalidarCodigo(comErro, "a@b.invalid")).toBe(false)
      expect(generateLink).not.toHaveBeenCalled()
    })

    it("recusa do GoTrue informa a falha", async () => {
      const { cliente } = clienteDaConta(
        "confirmed",
        vi.fn().mockResolvedValue({ data: null, error: { message: "falhou" } }),
      )
      expect(await invalidarCodigo(cliente, "a@b.invalid")).toBe(false)
    })
  })
})
