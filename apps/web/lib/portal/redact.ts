const CPF_FORMATTED = /\d{3}\.\d{3}\.\d{3}-\d{2}/g
const CPF_DIGITS = /\b\d{11}\b/g

export const PORTAL_PII_KEYS = [
  "orgao_servidor",
  "orgao",
  "orgao_lotacao",
  "situacao_funcional",
  "situacao",
] as const

export function redactCpf(text: string): string {
  return text.replace(CPF_FORMATTED, "[CPF REDACTED]").replace(CPF_DIGITS, "[CPF REDACTED]")
}

export function redactPortalPayload<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj }
  for (const key of PORTAL_PII_KEYS) {
    if (key in result) {
      ;(result as Record<string, unknown>)[key] = "[REDACTED]"
    }
  }
  return result
}
