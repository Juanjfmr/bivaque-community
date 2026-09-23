export const RECOVERY_INTENT_COOKIE = "bivaque-recovery-intent"
export const RECOVERY_INTENT_VALUE = "ready"
export const RECOVERY_INTENT_MAX_AGE_SECONDS = 10 * 60
export const RECOVERY_PATH = "/nova-senha"

export function hasRecoveryIntent(value: string | undefined): boolean {
  return value === RECOVERY_INTENT_VALUE
}

export function isRecoveryNext(value: string): boolean {
  const [pathname = ""] = value.split(/[?#]/, 1)
  return pathname === RECOVERY_PATH
}
