import { describe, expect, it } from "vitest"
import {
  codigoDeEntrada,
  DIGITOS_DO_CODIGO,
  emailDeEntrada,
  MINUTOS_DE_VALIDADE,
  SEGUNDOS_DE_REENVIO,
  vereditoDaVerificacao,
  vereditoDoEnvio,
} from "web/lib/app-api/entrada-otp"

// Entrada por código (ADR-20261101): as duas garantias que os testes fixam são
// anti-enumeração no envio e mensagem única no código errado/vencido/reusado.

describe("normalização do e-mail", () => {
  it("aceita endereço comum, aparando espaço e caixa", () => {
    expect(emailDeEntrada("  Pessoa@Example.INVALID ")).toBe("pessoa@example.invalid")
  })

  it("recusa o que não tem cara de endereço", () => {
    for (const bruto of [
      null,
      undefined,
      "",
      "   ",
      "sem-arroba",
      "a@b",
      "a@b.",
      "x".repeat(250),
    ]) {
      expect(emailDeEntrada(bruto), String(bruto)).toBeNull()
    }
  })
})

describe("normalização do código", () => {
  it("aceita 6 dígitos, inclusive colados com espaço ou hífen", () => {
    expect(codigoDeEntrada("123456")).toBe("123456")
    expect(codigoDeEntrada("123 456")).toBe("123456")
    expect(codigoDeEntrada("123-456")).toBe("123456")
    expect(codigoDeEntrada(123456)).toBe("123456")
  })

  it("recusa tamanho diferente de 6", () => {
    for (const bruto of ["12345", "1234567", "", "abcdef", null]) {
      expect(codigoDeEntrada(bruto), String(bruto)).toBeNull()
    }
  })

  it("o contrato bate com o config do Supabase", () => {
    expect(DIGITOS_DO_CODIGO).toBe(6)
    expect(MINUTOS_DE_VALIDADE).toBe(10)
    expect(SEGUNDOS_DE_REENVIO).toBe(60)
  })
})

describe("veredito do envio", () => {
  it("sem erro é enviado", () => {
    expect(vereditoDoEnvio(null)).toEqual({ estado: "enviado" })
  })

  it("conta inexistente e conta existente respondem igual (anti-enumeração)", () => {
    const semConta = { code: "user_not_found", message: "User not found", status: 400 }
    const outro = { code: "signup_disabled", message: "Signups not allowed for otp", status: 422 }
    expect(vereditoDoEnvio(semConta)).toEqual({ estado: "enviado" })
    expect(vereditoDoEnvio(outro)).toEqual({ estado: "enviado" })
  })

  it("limite de reenvio volta com os segundos do servidor", () => {
    expect(
      vereditoDoEnvio({
        code: "over_email_send_rate_limit",
        message: "For security purposes, you can only request this after 47 seconds.",
        status: 429,
      }),
    ).toEqual({ estado: "limite", reenviarEm: 47 })
  })

  it("falha de transporte e erro desconhecido são indisponível, nunca enviado", () => {
    expect(vereditoDoEnvio({ name: "TypeError", message: "Failed to fetch" })).toEqual({
      estado: "indisponivel",
    })
    expect(vereditoDoEnvio({ code: "unexpected_failure", message: "boom", status: 500 })).toEqual({
      estado: "indisponivel",
    })
  })
})

describe("veredito da verificação", () => {
  it("sem erro é autenticado", () => {
    expect(vereditoDaVerificacao(null)).toEqual({ estado: "autenticado" })
  })

  it("código errado, vencido ou reusado têm a mesma resposta", () => {
    const casos = [
      { code: "otp_expired", message: "Token has expired or is invalid", status: 403 },
      { code: "invalid_otp", message: "Invalid OTP", status: 400 },
      { code: "", message: "Token has expired or is invalid", status: 403 },
    ]
    for (const caso of casos) {
      expect(vereditoDaVerificacao(caso), caso.message).toEqual({ estado: "codigo-invalido" })
    }
  })

  it("limite do GoTrue vira limite, com os segundos do contrato", () => {
    expect(vereditoDaVerificacao({ code: "over_request_rate_limit", status: 429 })).toEqual({
      estado: "limite",
      reenviarEm: 60,
    })
  })

  it("falha desconhecida é indisponível, nunca código inválido", () => {
    expect(vereditoDaVerificacao({ code: "unexpected_failure", status: 500 })).toEqual({
      estado: "indisponivel",
    })
  })
})
