/**
 * Minimal structured logger for Bivaque server runtime.
 *
 * Never logs: CPF, rank, OM (organização militar), residential address, Portal payload,
 * or raw message content containing sensitive data. Redacts inline before output.
 *
 * Uses console.error / console.warn / console.info — no external deps.
 */

const SENSITIVE_FIELD_NAMES = new Set([
  "cpf",
  "document",
  "documento",
  "address",
  "endereco",
  "endereço",
  "cep",
  "rank",
  "patente",
  "orgao",
  "orgao_servidor",
  "orgao_lotacao",
  "situacao_funcional",
  "nome",
  "email",
  "phone",
  "telefone",
  "token",
  "api_key",
  "portal_payload",
  "raw_message",
  "raw_body",
  "authorization",
  "cookie",
  "set-cookie",
])

const REDACTED = "[REDACTED]"

function redactCPF(value: string): string {
  return value.replace(/\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}\b/g, REDACTED)
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const lower = key.toLowerCase()
    if (SENSITIVE_FIELD_NAMES.has(lower)) {
      result[key] = REDACTED
      continue
    }
    if (typeof value === "string") {
      result[key] = redactCPF(value)
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "object" && item !== null
          ? redactObject(item as Record<string, unknown>)
          : item,
      )
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactObject(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

function formatLine(
  level: "info" | "warn" | "error",
  message: string,
  fields?: Record<string, unknown>,
): string {
  const timestamp = new Date().toISOString()
  const safeMessage = redactCPF(message)
  if (!fields) {
    return JSON.stringify({ time: timestamp, level, msg: safeMessage })
  }
  const safeFields = redactObject(fields)
  return JSON.stringify({ time: timestamp, level, msg: safeMessage, ...safeFields })
}

function write(
  level: "info" | "warn" | "error",
  message: string,
  fields?: Record<string, unknown>,
) {
  const line = formatLine(level, message, fields)
  switch (level) {
    case "error":
      console.error(line)
      break
    case "warn":
      console.warn(line)
      break
    case "info":
      console.info(line)
      break
  }
}

export const log = {
  info(message: string, fields?: Record<string, unknown>) {
    write("info", message, fields)
  },
  warn(message: string, fields?: Record<string, unknown>) {
    write("warn", message, fields)
  },
  error(message: string, fields?: Record<string, unknown>) {
    write("error", message, fields)
  },
}
