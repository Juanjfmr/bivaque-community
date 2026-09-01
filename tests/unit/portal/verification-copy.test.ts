import { describe, expect, it } from "vitest"
import { verificationErrorMessage } from "web/lib/portal/verification-copy"

const SUPPORT_EMAIL = "suporte@bivaque.example.invalid"

const KNOWN_CODES = [
  "SCHEMA_DRIFT",
  "HTTP_ERROR",
  "TIMEOUT",
  "RATE_LIMITED",
  "INVALID_KEY",
  "EMPTY_RESPONSE",
] as const

describe("verificationErrorMessage", () => {
  it("maps RATE_LIMITED to the launch-peak copy without the raw code", () => {
    const message = verificationErrorMessage("RATE_LIMITED", SUPPORT_EMAIL)
    expect(message).toBe(
      "O Portal da Transparência está recebendo muitas consultas agora. Tente de novo em alguns minutos — seus dados não foram perdidos.",
    )
    expect(message).not.toContain("RATE_LIMITED")
    expect(message).toContain("Portal da Transparência")
  })

  it("maps TIMEOUT and HTTP_ERROR to the retry copy without the raw code", () => {
    for (const code of ["TIMEOUT", "HTTP_ERROR"]) {
      const message = verificationErrorMessage(code, SUPPORT_EMAIL)
      expect(message).toBe(
        "O Portal da Transparência demorou mais que o esperado para responder. Tente de novo em alguns minutos.",
      )
      expect(message).not.toContain(code)
    }
  })

  it("names the Portal when its key is unavailable", () => {
    const message = verificationErrorMessage("INVALID_KEY", SUPPORT_EMAIL)
    expect(message).toBe(
      `Não foi possível consultar o Portal da Transparência agora. Tente mais tarde ou fale com a gente: ${SUPPORT_EMAIL}.`,
    )
    expect(message).not.toContain("INVALID_KEY")
    expect(message).toContain(SUPPORT_EMAIL)
  })

  it("maps schema drift to the instability copy with the support channel", () => {
    const message = verificationErrorMessage("SCHEMA_DRIFT", SUPPORT_EMAIL)
    expect(message).toBe(
      `O Portal da Transparência está instável no momento. Tente mais tarde ou fale com a gente: ${SUPPORT_EMAIL}.`,
    )
    expect(message).not.toContain("SCHEMA_DRIFT")
    expect(message).toContain(SUPPORT_EMAIL)
  })

  it("never leaks a raw error code into any known message", () => {
    for (const code of KNOWN_CODES) {
      const message = verificationErrorMessage(code, SUPPORT_EMAIL)
      for (const raw of KNOWN_CODES) {
        expect(message, `message for ${code} must not contain raw ${raw}`).not.toContain(raw)
      }
    }
  })

  it("falls back to the instability copy for unknown codes without leaking them", () => {
    const message = verificationErrorMessage("SOME_FUTURE_CODE", SUPPORT_EMAIL)
    expect(message).toBe(
      `O Portal da Transparência está instável no momento. Tente mais tarde ou fale com a gente: ${SUPPORT_EMAIL}.`,
    )
    expect(message).not.toContain("SOME_FUTURE_CODE")
  })

  it("does not leave a broken support suffix when the email is unavailable", () => {
    const message = verificationErrorMessage("INVALID_KEY", "")
    expect(message).toBe(
      "Não foi possível consultar o Portal da Transparência agora. Tente mais tarde.",
    )
    expect(message).not.toContain(": .")
  })
})
