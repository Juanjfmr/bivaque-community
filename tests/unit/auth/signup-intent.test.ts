import { describe, expect, it } from "vitest"
import { hasSignupConsentIntent, signupConsentValue } from "web/lib/auth/signup-intent"

describe("intent server-side do aceite no OAuth", () => {
  it("aceita somente o valor emitido para o fluxo correspondente", () => {
    expect(hasSignupConsentIntent(signupConsentValue("email"), "email")).toBe(true)
    expect(hasSignupConsentIntent(signupConsentValue("google"), "google")).toBe(true)
    expect(hasSignupConsentIntent(signupConsentValue("email"), "google")).toBe(false)
  })

  it("rejeita cookie ausente, vazio ou adulterado", () => {
    expect(hasSignupConsentIntent(undefined)).toBe(false)
    expect(hasSignupConsentIntent("")).toBe(false)
    expect(hasSignupConsentIntent("forjado")).toBe(false)
  })
})
