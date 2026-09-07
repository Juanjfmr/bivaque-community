// apps/mobile/src/auth/entry-send.ts
// Classificação do envio do link de acesso no nativo.
//
// Porta de apps/web/lib/auth/entry-send.ts. A regra é a mesma e precisa
// continuar sendo: em /login o GoTrue devolve 422 `otp_disabled` para endereço
// sem conta e 200 para endereço com conta, então uma interface que reflita a
// diferença deixa qualquer pessoa descobrir quem é membro do Bivaque digitando
// e-mails. "Conta não encontrada" e "envio concluído" colapsam no mesmo estado
// visível; o que continua distinguível é o que não fala sobre a conta.
//
// Por que uma cópia e não um import compartilhado: web e mobile são builds
// separados (Next.js vs Expo/Metro), com alvos de TypeScript diferentes. É a
// mesma razão já registrada em src/auth/publish-error.ts, que porta o
// classificador do compositor. Quando um lado divergir, o outro tem que mudar
// junto.
//
// Códigos e mensagens conferidos contra a stack local em 2026-09-06.

export type EntrySendOutcome = "sent" | "rate-limited" | "offline" | "failed"

export interface EntrySendView {
  outcome: EntrySendOutcome
  message: string
  retryAfterSeconds?: number
  diagnostic: string
}

const SENT_MESSAGE =
  "Se este endereço puder entrar no Bivaque, o link já está a caminho. Confira sua caixa de entrada e o spam."
const OFFLINE_MESSAGE = "Verifique sua conexão e tente de novo."
const FAILED_MESSAGE = "Não foi possível enviar o link agora. Tente novamente em instantes."

const DEFAULT_RETRY_SECONDS = 60

const ACCOUNT_EXISTENCE_CODES = [
  "otp_disabled",
  "signup_disabled",
  "user_not_found",
  "email_not_confirmed",
  "user_banned",
]

const ACCOUNT_EXISTENCE_MESSAGES = [
  "signups not allowed for otp",
  "user not found",
  "email not confirmed",
  "user already registered",
]

const RATE_LIMIT_CODES = ["over_email_send_rate_limit", "over_request_rate_limit"]

const RETRY_SECONDS_PATTERN = /after (\d+) seconds?/i

const NETWORK_NAME_PATTERNS = ["TypeError", "AbortError", "NetworkError"]

const NETWORK_MESSAGE_PATTERNS = [
  "failed to fetch",
  "network request failed",
  "fetch failed",
  "networkerror when attempting",
  "load failed",
  "aborted",
  "timed out",
  "timeout",
]

interface ShapeProbe {
  name?: unknown
  message?: unknown
  code?: unknown
  status?: unknown
  retryAfter?: unknown
}

const probe = (error: unknown): ShapeProbe =>
  typeof error === "object" && error !== null ? (error as ShapeProbe) : {}

const asText = (value: unknown): string => (typeof value === "string" ? value : "")

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined

const isNetwork = (name: string, message: string): boolean => {
  const lower = message.toLowerCase()
  if (NETWORK_MESSAGE_PATTERNS.some((pattern) => lower.includes(pattern))) return true
  return NETWORK_NAME_PATTERNS.includes(name) && lower === ""
}

const retrySecondsFrom = (message: string, error: ShapeProbe): number => {
  const parsed = RETRY_SECONDS_PATTERN.exec(message)
  if (parsed?.[1]) {
    const seconds = Number.parseInt(parsed[1], 10)
    // Zero é resposta legítima: com `max_frequency` curto o GoTrue responde
    // "after 0 seconds". Exigir `> 0` prendia a pessoa por um minuto à toa.
    if (Number.isFinite(seconds) && seconds >= 0) return seconds
  }
  const header = asNumber(error.retryAfter)
  return header && header > 0 ? header : DEFAULT_RETRY_SECONDS
}

export function classifyEntrySend(error: unknown): EntrySendView {
  if (error === null || error === undefined) {
    return { outcome: "sent", message: SENT_MESSAGE, diagnostic: "ok" }
  }

  const shape = probe(error)
  const name = asText(shape.name)
  const message = asText(shape.message)
  const code = asText(shape.code).toLowerCase()
  const status = asNumber(shape.status)
  const lower = message.toLowerCase()
  const diagnostic = `${name || "Error"}: ${message || "(sem mensagem)"}${
    code ? ` [${code}]` : ""
  }${status ? ` (${status})` : ""}`

  if (isNetwork(name, message)) {
    return { outcome: "offline", message: OFFLINE_MESSAGE, diagnostic }
  }

  if (status === 429 || RATE_LIMIT_CODES.includes(code) || RETRY_SECONDS_PATTERN.test(message)) {
    const retryAfterSeconds = retrySecondsFrom(message, shape)
    return {
      outcome: "rate-limited",
      message:
        retryAfterSeconds > 0
          ? `Aguarde ${retryAfterSeconds}s para pedir outro link.`
          : "Muitos pedidos seguidos. Tente de novo.",
      retryAfterSeconds,
      diagnostic,
    }
  }

  if (
    ACCOUNT_EXISTENCE_CODES.includes(code) ||
    ACCOUNT_EXISTENCE_MESSAGES.some((pattern) => lower.includes(pattern))
  ) {
    return { outcome: "sent", message: SENT_MESSAGE, diagnostic }
  }

  return { outcome: "failed", message: FAILED_MESSAGE, diagnostic }
}
