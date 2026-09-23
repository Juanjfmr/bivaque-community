export const SIGNUP_CONSENT_INTENT_COOKIE = "bivaque-signup-consent-intent"
export const SIGNUP_CONSENT_INTENT_VALUE = "ready"
export const SIGNUP_CONSENT_INTENT_MAX_AGE_SECONDS = 24 * 60 * 60

export function hasSignupConsentIntent(value: string | undefined): boolean {
  return value === SIGNUP_CONSENT_INTENT_VALUE
}
