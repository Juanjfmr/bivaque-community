export type SignupConsentFlow = "email" | "google"

export const SIGNUP_CONSENT_INTENT_COOKIE = "bivaque-signup-consent-intent"
export const SIGNUP_CONSENT_INTENT_MAX_AGE_SECONDS = 24 * 60 * 60
export const SIGNUP_CONSENT_EMAIL_FLOW = "signup-confirmation"
export const SIGNUP_CONSENT_GOOGLE_FLOW = "signup-google"

export function signupConsentValue(flow: SignupConsentFlow): string {
  return `${flow}-ready`
}

export function hasSignupConsentIntent(
  value: string | undefined,
  flow?: SignupConsentFlow,
): boolean {
  if (value === undefined) return false
  if (flow === undefined) {
    return value === signupConsentValue("email") || value === signupConsentValue("google")
  }
  return value === signupConsentValue(flow)
}
