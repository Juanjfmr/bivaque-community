import { describe, expect, it } from "vitest"
import { hasSignupConsentIntent, SIGNUP_CONSENT_INTENT_VALUE } from "web/lib/auth/signup-intent"

describe("intent server-side do aceite no OAuth", () => {
  it("aceita somente o valor emitido pela Server Action", () => {
    expect(hasSignupConsentIntent(SIGNUP_CONSENT_INTENT_VALUE)).toBe(true)
  })

  it("rejeita cookie ausente, vazio ou adulterado", () => {
    expect(hasSignupConsentIntent(undefined)).toBe(false)
    expect(hasSignupConsentIntent("")).toBe(false)
    expect(hasSignupConsentIntent("forjado")).toBe(false)
  })
})
