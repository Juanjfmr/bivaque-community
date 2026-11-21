// D1 Task 6 — mandatory PII scrubbing before any event leaves to Sentry.
// The default is "do not send"; whatever is sent is an explicit choice.
// Pure and testable: the Sentry `beforeSend` hook wires this, but the scrubber
// itself never depends on the SDK.

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g
const CPF = /\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}\b/g
const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g
const AUTH_HEADER = /(authorization\s*[:=]\s*).+/gi

// Fields whose whole value is user content or a credential: replace, never
// pattern-scrub, because user-generated text can contain anything.
const REDACTED_KEYS = new Set([
  "content",
  "body",
  "message",
  "post",
  "password",
  "secret",
  "authorization",
  "access_token",
  "refresh_token",
  "provider_token",
  "provider_refresh_token",
  "auth_code",
  "code_verifier",
])

const SESSION_PATH = /\/api\/app\/sessao\//i
const PRIVATE_BODY_PATH =
  /\/api\/app\/(?:sessao\/[^?#\s]*|entry\/otp\/verify|voce\/sair)(?:[?#\s]|$)/i
const URL_IN_TEXT = /(?:[a-z][a-z0-9+.-]*:\/\/[^\s"'<>]+|\/[a-z0-9_./-]+\?[^\s"'<>]*)/gi

export function scrubCredentialUrls(value: string): string {
  return value.replace(URL_IN_TEXT, (url) => {
    const hideCode = /^bivaque:\/\/auth-callback(?:[/?#]|$)/i.test(url) || SESSION_PATH.test(url)
    return url.replace(/([?&])([^=&#]+)=([^&#\s]*)/g, (param, separator: string, key: string) => {
      let name: string
      try {
        name = decodeURIComponent(key.replace(/\+/g, " ")).toLowerCase()
      } catch {
        return param
      }
      return (REDACTED_KEYS.has(name) &&
        [
          "access_token",
          "refresh_token",
          "provider_token",
          "provider_refresh_token",
          "auth_code",
          "code_verifier",
        ].includes(name)) ||
        (hideCode && name === "code")
        ? `${separator}${key}=[redacted]`
        : param
    })
  })
}

export function scrubPii(value: string): string {
  return scrubCredentialUrls(value)
    .replace(AUTH_HEADER, "$1[redacted]")
    .replace(JWT, "[redacted]")
    .replace(EMAIL, "[redacted]")
    .replace(CPF, "[redacted]")
}

export function scrubEvent(input: unknown, session = false): unknown {
  if (typeof input === "string") return scrubPii(input)
  if (Array.isArray(input)) return input.map((item) => scrubEvent(item, session))
  if (input !== null && typeof input === "object") {
    const obj = input as Record<string, unknown>
    const url = typeof obj["url"] === "string" ? obj["url"] : ""
    const isSession = session || SESSION_PATH.test(url)
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      const lower = key.toLowerCase()
      if (PRIVATE_BODY_PATH.test(url) && (lower === "data" || lower === "body")) continue
      out[key] =
        REDACTED_KEYS.has(lower) || (isSession && lower === "code")
          ? "[redacted]"
          : scrubEvent(value, isSession)
    }
    return out
  }
  return input
}

// Onda H — Task 2: a denúncia é o único texto do produto escrito por um
// terceiro SOBRE outra pessoa. O CPF alheio não pode entrar no banco (D11),
// mas a frase precisa continuar legível para o operador — por isso redige,
// não rejeita, e por isso NÃO existe filtro de vocabulário aqui (D21
// derrubou o anterior por proibir "patente" e "OM", que é como a comunidade
// real fala). Marca: "[documento removido]". Falso positivo em sequência de
// 11 dígitos que não é CPF é aceito de propósito, e o teste registra.
// Aceita separador arbitrário entre os blocos (incluindo ausente) e aceita
// separador antes dos 2 últimos dígitos — CPFs digitados com ponto no lugar
// do hífen (529.982.247.25) também são redigidos. A redação por formato é
// deliberada, mesmo para sequências de 11 dígitos que não sejam CPF — ver
// o teste unitário.
const REPORT_DOC_PATTERN_FORMATTED = /\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}\b/g
const REPORT_DOC_PATTERN_PLAIN = /\b\d{11}\b/g

export function scrubReportReason(reason: string): string {
  return reason
    .replace(REPORT_DOC_PATTERN_FORMATTED, "[documento removido]")
    .replace(REPORT_DOC_PATTERN_PLAIN, "[documento removido]")
}
