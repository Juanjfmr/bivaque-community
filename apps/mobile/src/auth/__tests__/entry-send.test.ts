import { describe, expect, it } from "vitest"
import { classifyEntrySend } from "../entry-send"

// Espelho de tests/unit/auth/entry-send.test.ts. A cópia nativa existe porque
// web e mobile são builds separados; este teste é o que impede a cópia de
// divergir em silêncio justamente na regra que protege a lista de membros.

const authError = (fields: Record<string, unknown>) => Object.assign(new Error(), fields)

describe("classifyEntrySend nativo — anti-enumeração", () => {
  it("trata sucesso e conta inexistente como o mesmo estado visível", () => {
    // Respostas reais do GoTrue, medidas em 2026-09-06 contra a stack local.
    const success = classifyEntrySend(null)
    const unknownAccount = classifyEntrySend(
      authError({
        name: "AuthApiError",
        message: "Signups not allowed for otp",
        code: "otp_disabled",
        status: 422,
      }),
    )

    expect(success.outcome).toBe("sent")
    expect(unknownAccount.outcome).toBe("sent")
    expect(unknownAccount.message).toBe(success.message)
  })

  it("nunca devolve o texto cru do servidor para a tela", () => {
    const view = classifyEntrySend(
      authError({ message: "Signups not allowed for otp", code: "otp_disabled", status: 422 }),
    )
    expect(view.message).not.toContain("otp")
    expect(view.diagnostic).toContain("Signups not allowed for otp")
  })
})

describe("classifyEntrySend nativo — o que continua distinguível", () => {
  it("reconhece falha de transporte", () => {
    // "Network request failed" é a forma que o fetch do React Native toma
    // quando o aparelho não alcança o host — no emulador, o caso comum é o
    // app apontar para 127.0.0.1 em vez de 10.0.2.2.
    expect(classifyEntrySend(authError({ message: "Network request failed" })).outcome).toBe(
      "offline",
    )
  })

  it("respeita zero segundo no limite de reenvio", () => {
    const view = classifyEntrySend(
      authError({
        message: "For security purposes, you can only request this after 0 seconds.",
        code: "over_email_send_rate_limit",
        status: 429,
      }),
    )
    expect(view.outcome).toBe("rate-limited")
    expect(view.retryAfterSeconds).toBe(0)
    expect(view.message).not.toContain("0s")
  })

  it("extrai a espera quando o servidor informa", () => {
    const view = classifyEntrySend(
      authError({ message: "you can only request this after 47 seconds.", status: 429 }),
    )
    expect(view.retryAfterSeconds).toBe(47)
  })

  it("trata erro desconhecido como falha, não como enviado", () => {
    const view = classifyEntrySend(authError({ message: "boom", status: 500 }))
    expect(view.outcome).toBe("failed")
    expect(view.message).not.toBe(classifyEntrySend(null).message)
  })
})
