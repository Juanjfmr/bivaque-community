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
      "Estamos com muitos cadastros agora. Tente de novo em alguns minutos — seus dados não foram perdidos.",
    )
    expect(message).not.toContain("RATE_LIMITED")
    expect(message).not.toContain("Portal")
  })

  it("maps TIMEOUT and HTTP_ERROR to the retry copy without the raw code", () => {
    for (const code of ["TIMEOUT", "HTTP_ERROR"]) {
      const message = verificationErrorMessage(code, SUPPORT_EMAIL)
      expect(message).toBe("A consulta demorou mais que o esperado. Tente de novo.")
      expect(message).not.toContain(code)
    }
  })

  it("maps INVALID_KEY and SCHEMA_DRIFT to the instability copy with the support channel", () => {
    for (const code of ["INVALID_KEY", "SCHEMA_DRIFT"]) {
      const message = verificationErrorMessage(code, SUPPORT_EMAIL)
      expect(message).toBe(
        `Estamos com uma instabilidade. Já fomos avisados — tente mais tarde ou fale com a gente: ${SUPPORT_EMAIL}.`,
      )
      expect(message).not.toContain(code)
      expect(message).toContain(SUPPORT_EMAIL)
    }
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
      `Estamos com uma instabilidade. Já fomos avisados — tente mais tarde ou fale com a gente: ${SUPPORT_EMAIL}.`,
    )
    expect(message).not.toContain("SOME_FUTURE_CODE")
  })
})
