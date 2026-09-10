/**
 * Classificação dos erros de entrada com e-mail e senha.
 *
 * Códigos medidos contra a stack local em 2026-09-07, não presumidos:
 *
 *   login, senha errada        -> 400 invalid_credentials "Invalid login credentials"
 *   login, conta inexistente   -> 400 invalid_credentials "Invalid login credentials"
 *   cadastro, e-mail novo      -> 200
 *   cadastro, e-mail existente -> 422 user_already_exists "User already registered"
 *
 * A primeira dupla é o achado que importa: o GoTrue já responde a mesma coisa
 * para senha errada e para conta que não existe. A mensagem única
 * "E-mail ou senha incorretos" não é rigor acrescentado por nós — é o que o
 * provedor permite dizer. Distinguir os dois exigiria consultar a base à parte,
 * e é justamente o que entregaria a lista de membros a quem digitasse e-mails.
 *
 * No cadastro o provedor distingue, e nós contamos: quem está criando conta
 * digitou o próprio endereço, e esconder isso deixa a pessoa sem saída. É o
 * comportamento de Instagram e Facebook, e está registrado como consequência
 * aceita em ADR-20260907-login-com-senha.
 *
 * Função pura: sem import de runtime, testável sem navegador.
 */

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
  /** Verdadeiro quando o próximo passo da pessoa é entrar, não criar conta. */
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

const describe = (
  error: unknown,
): { view: PasswordAuthView | null; probe: Probe; diagnostic: string } => {
  const shape = probe(error)
  const name = text(shape.name)
  const message = text(shape.message)
  const code = text(shape.code).toLowerCase()
  const status = typeof shape.status === "number" ? shape.status : undefined
  const diagnostic = `${name || "Error"}: ${message || "(sem mensagem)"}${code ? ` [${code}]` : ""}${
    status ? ` (${status})` : ""
  }`

  if (isNetwork(name, message)) {
    return { view: { outcome: "offline", message: OFFLINE, diagnostic }, probe: shape, diagnostic }
  }

  if (status === 429 || code.includes("rate_limit") || RETRY_SECONDS.test(message)) {
    const parsed = RETRY_SECONDS.exec(message)
    const seconds = parsed?.[1] ? Number.parseInt(parsed[1], 10) : 0
    return {
      view: {
        outcome: "rate-limited",
        message:
          seconds > 0
            ? `Muitas tentativas. Aguarde ${seconds}s.`
            : "Muitas tentativas seguidas. Tente de novo em instantes.",
        diagnostic,
      },
      probe: shape,
      diagnostic,
    }
  }

  return { view: null, probe: shape, diagnostic }
}

export function classifySignIn(error: unknown): PasswordAuthView {
  if (error === null || error === undefined) {
    return { outcome: "ok", message: "", diagnostic: "ok" }
  }

  const { view, probe: shape, diagnostic } = describe(error)
  if (view) return view

  const code = text(shape.code).toLowerCase()
  const message = text(shape.message).toLowerCase()

  // Um endereço sem conta e uma senha errada chegam aqui com o MESMO código.
  // Manter os dois na mesma resposta é o comportamento do provedor, não uma
  // escolha que possa se perder numa refatoração.
  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return { outcome: "invalid-credentials", message: COPY_INVALID_LOGIN, diagnostic }
  }

  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return { outcome: "invalid-credentials", message: COPY_INVALID_LOGIN, diagnostic }
  }

  return { outcome: "failed", message: FAILED, diagnostic }
}

export function classifySignUp(error: unknown): PasswordAuthView {
  if (error === null || error === undefined) {
    return { outcome: "ok", message: "", diagnostic: "ok" }
  }

  const { view, probe: shape, diagnostic } = describe(error)
  if (view) return view

  const code = text(shape.code).toLowerCase()
  const message = text(shape.message).toLowerCase()

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
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use ao menos ${PASSWORD_MIN_LENGTH} caracteres.`
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Misture letras e números."
  }
  return null
}
