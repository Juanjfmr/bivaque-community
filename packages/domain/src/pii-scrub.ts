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
])

export function scrubPii(value: string): string {
  return value
    .replace(AUTH_HEADER, "$1[redacted]")
    .replace(JWT, "[redacted]")
    .replace(EMAIL, "[redacted]")
    .replace(CPF, "[redacted]")
}

export function scrubEvent(input: unknown): unknown {
  if (typeof input === "string") return scrubPii(input)
  if (Array.isArray(input)) return input.map(scrubEvent)
  if (input !== null && typeof input === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? "[redacted]" : scrubEvent(value)
    }
    return out
  }
  return input
}
