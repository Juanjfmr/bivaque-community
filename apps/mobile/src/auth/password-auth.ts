// apps/mobile/src/auth/password-auth.ts
// Classificação dos erros de entrada com e-mail e senha, no nativo.
//
// Porta de apps/web/lib/auth/password-auth.ts, pela mesma razão já registrada
// em publish-error.ts: web e mobile são builds separados. O teste espelho em
// __tests__/password-auth.test.ts impede a cópia de divergir.
//
// Códigos medidos contra a stack local em 2026-09-07:
//   login, senha errada        -> 400 invalid_credentials
//   login, conta inexistente   -> 400 invalid_credentials  (mesma resposta)
//   cadastro, e-mail existente -> 422 user_already_exists

export type PasswordAuthOutcome =
  | "ok"
  | "invalid-credentials"
  | "email-taken"
  | "weak-password"
  | "rate-limited"
  | "offline"
  | "failed"

export interface PasswordAuthView {
  outcome: PasswordAuthOutcome
  message: string
  suggestSignIn?: boolean
  diagnostic: string
}

const COPY_INVALID_LOGIN = "E-mail ou senha incorretos."
const EMAIL_TAKEN = "Este e-mail já tem conta no Bivaque."
const COPY_SENHA_CURTA = "A senha precisa ter ao menos 8 caracteres, com letras e números."
const OFFLINE = "Verifique sua conexão e tente de novo."
const FAILED = "Não foi possível continuar agora. Tente novamente em instantes."

const NETWORK_NAMES = ["TypeError", "AbortError", "NetworkError"]
const NETWORK_MESSAGES = [
  "failed to fetch",
  "network request failed",
  "fetch failed",
  "networkerror when attempting",
  "load failed",
  "aborted",
  "timed out",
  "timeout",
]

const RETRY_SECONDS = /after (\d+) seconds?/i

interface Probe {
  name?: unknown
  message?: unknown
  code?: unknown
  status?: unknown
}

const probe = (error: unknown): Probe =>
  typeof error === "object" && error !== null ? (error as Probe) : {}

const text = (value: unknown): string => (typeof value === "string" ? value : "")

const isNetwork = (name: string, message: string): boolean => {
  const lower = message.toLowerCase()
  if (NETWORK_MESSAGES.some((pattern) => lower.includes(pattern))) return true
  return NETWORK_NAMES.includes(name) && lower === ""
}

const shared = (error: unknown) => {
  const shape = probe(error)
  const name = text(shape.name)
  const message = text(shape.message)
  const code = text(shape.code).toLowerCase()
  const status = typeof shape.status === "number" ? shape.status : undefined
  const diagnostic = `${name || "Error"}: ${message || "(sem mensagem)"}${code ? ` [${code}]` : ""}${
    status ? ` (${status})` : ""
  }`

  if (isNetwork(name, message)) {
    return {
      early: { outcome: "offline" as const, message: OFFLINE, diagnostic },
      code,
      message,
      diagnostic,
    }
  }

  if (status === 429 || code.includes("rate_limit") || RETRY_SECONDS.test(message)) {
    const parsed = RETRY_SECONDS.exec(message)
    const seconds = parsed?.[1] ? Number.parseInt(parsed[1], 10) : 0
    return {
      early: {
        outcome: "rate-limited" as const,
        message:
          seconds > 0
            ? `Muitas tentativas. Aguarde ${seconds}s.`
            : "Muitas tentativas seguidas. Tente de novo em instantes.",
        diagnostic,
      },
      code,
      message,
      diagnostic,
    }
  }

  return { early: null, code, message: message.toLowerCase(), diagnostic }
}

export function classifySignIn(error: unknown): PasswordAuthView {
  if (error === null || error === undefined) {
    return { outcome: "ok", message: "", diagnostic: "ok" }
  }
  const { early, code, message, diagnostic } = shared(error)
  if (early) return early

  // Conta inexistente e senha errada chegam com o MESMO código. Manter os dois
  // no mesmo ramo é o que impede a tela de distinguir.
  if (
    code === "invalid_credentials" ||
    code === "email_not_confirmed" ||
    message.includes("invalid login credentials") ||
    message.includes("email not confirmed")
  ) {
    return { outcome: "invalid-credentials", message: COPY_INVALID_LOGIN, diagnostic }
  }

  return { outcome: "failed", message: FAILED, diagnostic }
}

export function classifySignUp(error: unknown): PasswordAuthView {
  if (error === null || error === undefined) {
    return { outcome: "ok", message: "", diagnostic: "ok" }
  }
  const { early, code, message, diagnostic } = shared(error)
  if (early) return early

  if (code === "user_already_exists" || message.includes("already registered")) {
    return { outcome: "email-taken", message: EMAIL_TAKEN, suggestSignIn: true, diagnostic }
  }

  if (code === "weak_password" || message.includes("password should be")) {
    return { outcome: "weak-password", message: COPY_SENHA_CURTA, diagnostic }
  }

  return { outcome: "failed", message: FAILED, diagnostic }
}

/** Espelha `minimum_password_length` e `password_requirements` do config.toml. */
export const PASSWORD_MIN_LENGTH = 8

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH)
    return `Use ao menos ${PASSWORD_MIN_LENGTH} caracteres.`
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return "Misture letras e números."
  return null
}
