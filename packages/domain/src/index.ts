export const LOCALITY_CODES = ["manaus-am"] as const
export type LocalityCode = (typeof LOCALITY_CODES)[number]

export const PILOT_LOCALITY_CODE = "manaus-am" satisfies LocalityCode

export const PRIVACY_VISIBILITIES = ["community", "private"] as const
export type PrivacyVisibility = (typeof PRIVACY_VISIBILITIES)[number]

export const ALLOWED_STORAGE_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
export type AllowedStorageImageMime = (typeof ALLOWED_STORAGE_IMAGE_MIME_TYPES)[number]

export const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024
export const EVENT_PHOTO_MAX_SIZE_BYTES = 10 * 1024 * 1024

export const EVENT_STATUSES = ["upcoming", "cancelled"] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]

export const EVENT_RSVP_STATUSES = ["interested", "going"] as const
export type EventRsvpStatus = (typeof EVENT_RSVP_STATUSES)[number]

export const RECOMMENDATION_CATEGORIES = [
  "servicos_locais",
  "saude_bem_estar",
  "educacao",
  "esporte_lazer",
  "alimentacao",
  "transporte",
  "moradia",
  "outros",
] as const
export type RecommendationCategory = (typeof RECOMMENDATION_CATEGORIES)[number]

export const POST_TYPES = ["text", "photo", "link", "poll"] as const
export type PostType = (typeof POST_TYPES)[number]

export const FEED_ORDERS = ["recent", "relevant"] as const
export type FeedOrder = (typeof FEED_ORDERS)[number]

export const POST_CONTENT_MAX_LENGTH = 2000
export const COMMENT_CONTENT_MAX_LENGTH = 1000

// ── PII pattern detection (D21: warn on real patterns, never on words) ─────

const CPF_CANDIDATE_PATTERN = /\b(\d{3})[.\s-]?(\d{3})[.\s-]?(\d{3})[-.\s]?(\d{2})\b/g

export function isValidCpf(digits: string): boolean {
  if (!/^\d{11}$/.test(digits)) return false
  // A CPF made of a single repeated digit has a valid check digit but is not
  // a real CPF.
  if (/^(\d)\1{10}$/.test(digits)) return false

  const digit = (index: number) => Number(digits[index])
  const checkDigit = (weightStart: number) => {
    let sum = 0
    for (let i = 0; i < weightStart; i++) {
      sum += digit(i) * (weightStart + 1 - i)
    }
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  return checkDigit(9) === digit(9) && checkDigit(10) === digit(10)
}

export function detectCpf(text: string): boolean {
  for (const match of text.matchAll(CPF_CANDIDATE_PATTERN)) {
    if (isValidCpf(match.slice(1).join(""))) return true
  }
  return false
}

export function detectCep(text: string): boolean {
  return /\b\d{5}-\d{3}\b/.test(text)
}

export * from "./rate-limit"
