/**
 * Classificação do envio do link de acesso (`signInWithOtp`) na tela de entrada.
 *
 * O problema que esta função resolve é de segurança, não de cosmética.
 *
 * Em `/login` o envio roda com `shouldCreateUser: false`. Um endereço sem conta
 * faz o GoTrue devolver erro, enquanto um endereço com conta devolve sucesso.
 * Se a interface refletir essa diferença — e refletia, com "Confira o endereço
 * ou crie sua conta" de um lado e "Enviamos o link" do outro — qualquer pessoa
 * descobre quem é membro do Bivaque digitando e-mails na tela de login. Numa
 * comunidade de militares federais, veteranos e pensionistas, a lista de quem
 * pertence é o dado que não pode vazar: ela expõe vínculo com a instituição.
 *
 * PROCESSO-DE-CONSTRUCAO §8: "Mensagens não devem expor resultados privados de
 * consultas de elegibilidade." O mesmo princípio já vale no compositor
 * (`lib/composer/publish-error.ts`, anti-enumeração de RLS); aqui ele chegou
 * depois porque a tela de entrada nasceu antes da regra.
 *
 * Por isso "conta não encontrada" e "envio concluído" colapsam no MESMO estado
 * visível. O custo é real e aceito: quem digitou o endereço errado vê a
 * confirmação e não recebe e-mail. A copy compensa dizendo o que fazer quando
 * a mensagem não chegar, sem afirmar se a conta existe.
 *
 * O que continua distinguível é o que NÃO fala sobre a conta: falha de
 * transporte (a pessoa precisa saber que está offline) e limite de reenvio
 * (a pessoa precisa saber quanto esperar). Nenhum dos dois muda de resposta
 * conforme o endereço digitado.
 *
 * Função pura: nenhum import de runtime, para poder ser testada sem navegador
 * e sem stack. O consumidor decide o que renderizar.
 */

export type EntrySendOutcome = "sent" | "rate-limited" | "offline" | "failed"

export interface EntrySendView {
  /** Chave de discriminação para testes, telemetria e ramificação de copy. */
  outcome: EntrySendOutcome
  /** Copy estável, voltada à pessoa. Nunca o erro cru do GoTrue. */
  message: string
  /** Segundos a esperar antes de reenviar. Só em `rate-limited`. */
  retryAfterSeconds?: number
  /** Detalhe só para diagnóstico. Não deve ser renderizado como está. */
  diagnostic: string
}

const SENT_MESSAGE =
  "Se este endereço puder entrar no Bivaque, o link já está a caminho. Confira sua caixa de entrada e o spam."
const OFFLINE_MESSAGE = "Verifique sua conexão e tente de novo."
const FAILED_MESSAGE = "Não foi possível enviar o link agora. Tente novamente em instantes."

const DEFAULT_RETRY_SECONDS = 60

// Erros que revelam a existência (ou ausência) da conta. Todos colapsam em
// "sent": a resposta visível não pode depender de o endereço estar cadastrado.
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

// O GoTrue devolve "For security purposes, you can only request this after 47
// seconds." O número é a única parte útil para a pessoa; o resto é texto de
// servidor e não vai para a tela.
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
}

const probe = (error: unknown): ShapeProbe =>
  typeof error === "object" && error !== null ? (error as ShapeProbe) : {}

const asText = (value: unknown): string => (typeof value === "string" ? value : "")

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined

const isNetwork = (name: string, message: string): boolean => {
  const lower = message.toLowerCase()
  if (NETWORK_MESSAGE_PATTERNS.some((pattern) => lower.includes(pattern))) return true
  // Um TypeError sem mensagem reconhecível ainda é, no navegador, a forma que
  // `fetch` toma quando a request nunca sai. Tratamos como transporte: pedir
  // para conferir a conexão é menos errado do que culpar o servidor.
  return NETWORK_NAME_PATTERNS.includes(name) && lower === ""
}

const retrySecondsFrom = (message: string, error: ShapeProbe): number => {
  const parsed = RETRY_SECONDS_PATTERN.exec(message)
  if (parsed?.[1]) {
    const seconds = Number.parseInt(parsed[1], 10)
    if (Number.isFinite(seconds) && seconds > 0) return seconds
  }
  const header = asNumber((error as { retryAfter?: unknown }).retryAfter)
  return header && header > 0 ? header : DEFAULT_RETRY_SECONDS
}

/**
 * `null`/`undefined` significa que o envio passou. Qualquer outra coisa é
 * classificada sem nunca deixar o resultado depender da existência da conta.
 */
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
      message: `Aguarde ${retryAfterSeconds}s para pedir outro link.`,
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

export const entrySendCopy = {
  sent: SENT_MESSAGE,
  offline: OFFLINE_MESSAGE,
  failed: FAILED_MESSAGE,
} as const
