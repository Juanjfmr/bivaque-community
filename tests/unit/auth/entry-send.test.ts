import { describe, expect, it } from "vitest"
import { classifyEntrySend } from "web/lib/auth/entry-send"

// O teste central desta suíte é o de enumeração: a resposta visível não pode
// mudar conforme o endereço tenha conta ou não. Os outros casos existem para
// provar que a neutralidade não engoliu os erros que a pessoa precisa ver.

const authError = (fields: Record<string, unknown>) => Object.assign(new Error(), fields)

describe("classifyEntrySend — anti-enumeração", () => {
  it("trata sucesso e conta inexistente como o mesmo estado visível", () => {
    const success = classifyEntrySend(null)
    const unknownAccount = classifyEntrySend(
      authError({ name: "AuthApiError", message: "Signups not allowed for otp", status: 422 }),
    )

    expect(success.outcome).toBe("sent")
    expect(unknownAccount.outcome).toBe("sent")
    expect(unknownAccount.message).toBe(success.message)
  })

  it("colapsa todo erro que fala sobre a conta no estado enviado", () => {
    const revealing = [
      authError({ code: "otp_disabled", status: 422 }),
      authError({ code: "user_not_found", status: 400 }),
      authError({ code: "signup_disabled", status: 422 }),
      authError({ code: "email_not_confirmed", status: 400 }),
      authError({ code: "user_banned", status: 403 }),
      authError({ message: "User not found" }),
      authError({ message: "User already registered" }),
    ]

    const messages = new Set(revealing.map((error) => classifyEntrySend(error).message))
    expect(messages.size).toBe(1)
    expect(messages.has(classifyEntrySend(null).message)).toBe(true)
  })

  it("nunca devolve o texto cru do servidor para a tela", () => {
    const view = classifyEntrySend(
      authError({ name: "AuthApiError", message: "Signups not allowed for otp", status: 422 }),
    )
    expect(view.message).not.toContain("otp")
    expect(view.message).not.toContain("Signups")
    // O detalhe continua disponível para diagnóstico, fora da renderização.
    expect(view.diagnostic).toContain("Signups not allowed for otp")
  })

  it("não afirma que a conta existe", () => {
    const message = classifyEntrySend(null).message.toLowerCase()
    expect(message).not.toContain("sua conta")
    expect(message).not.toContain("cadastrado no bivaque")
    expect(message).toContain("puder entrar")
  })
})

describe("classifyEntrySend — o que continua distinguível", () => {
  it("reconhece falha de transporte", () => {
    for (const error of [
      authError({ name: "TypeError", message: "Failed to fetch" }),
      authError({ name: "AbortError", message: "The operation was aborted" }),
      authError({ message: "Network request failed" }),
      authError({ name: "TypeError", message: "" }),
    ]) {
      expect(classifyEntrySend(error).outcome).toBe("offline")
    }
  })

  it("reconhece o limite de reenvio e extrai a espera", () => {
    const view = classifyEntrySend(
      authError({
        message: "For security purposes, you can only request this after 47 seconds.",
        status: 429,
      }),
    )
    expect(view.outcome).toBe("rate-limited")
    expect(view.retryAfterSeconds).toBe(47)
    expect(view.message).toContain("47s")
  })

  it("cai num padrão de espera quando o servidor não diz quanto", () => {
    const view = classifyEntrySend(authError({ code: "over_email_send_rate_limit", status: 429 }))
    expect(view.outcome).toBe("rate-limited")
    expect(view.retryAfterSeconds).toBe(60)
  })

  it("trata erro desconhecido como falha genérica, não como enviado", () => {
    const view = classifyEntrySend(
      authError({ name: "AuthApiError", message: "boom", status: 500 }),
    )
    expect(view.outcome).toBe("failed")
    expect(view.message).not.toBe(classifyEntrySend(null).message)
  })

  it("sobrevive a formatos que não são Error", () => {
    for (const value of ["texto", 42, {}, [], true]) {
      expect(classifyEntrySend(value).outcome).toBe("failed")
    }
  })
})
