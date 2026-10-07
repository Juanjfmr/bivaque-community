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

// BIVAQUE.md §7.2.1 — lista fechada. Não existe "Outros": o que não couber
// exige decisão de produto, e uma categoria só se divide acima de ~15 fichas
// ativas. Produtos e serviços convivem nesta mesma taxonomia.
export const PROVIDER_CATEGORIES = [
  "alimentacao",
  "casa_e_reformas",
  "assistencia_tecnica",
  "mudanca_e_transporte",
  "imoveis",
  "documentacao_e_financas",
  "saude_e_bem_estar",
  "beleza",
  "educacao_e_aulas",
  "automotivo",
  "eventos_e_festas",
  "pets",
] as const

export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number]

export const PROVIDER_CATEGORY_LABELS: Record<ProviderCategory, string> = {
  alimentacao: "Alimentação",
  casa_e_reformas: "Casa e reformas",
  assistencia_tecnica: "Assistência técnica",
  mudanca_e_transporte: "Mudança e transporte",
  imoveis: "Imóveis",
  documentacao_e_financas: "Documentação e finanças",
  saude_e_bem_estar: "Saúde e bem-estar",
  beleza: "Beleza",
  educacao_e_aulas: "Educação e aulas",
  automotivo: "Automotivo",
  eventos_e_festas: "Eventos e festas",
  pets: "Pets",
}

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

export * from "./consent"
export * from "./image-exif"
export * from "./outbox"
export * from "./pii-scrub"
export * from "./rate-limit"

// ── FIGMA-002: anúncios de moradia (ADR-20260909-anuncios-mercado-e-moradia) ──

// Limite de fotos por anúncio: Moradia 12, Mercado 6 (ADR de mídia D4; o dono
// reiterou 12 fotos na autorização de 05/10/2026). Validado no servidor.
export const LISTING_PROPERTY_MAX_PHOTOS = 12
export const LISTING_ITEM_MAX_PHOTOS = 6
export const LISTING_PHOTO_MAX_SIZE_BYTES = 10 * 1024 * 1024

export const LISTING_PROPERTY_TYPES = ["apartamento", "casa", "kitnet"] as const
export type ListingPropertyType = (typeof LISTING_PROPERTY_TYPES)[number]

export const LISTING_PROPERTY_TYPE_LABELS: Record<ListingPropertyType, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  kitnet: "Kitnet",
}

export const LISTING_STATUSES = ["draft", "active", "paused", "reserved", "sold", "closed"] as const
export type ListingStatus = (typeof LISTING_STATUSES)[number]

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  paused: "Pausado",
  reserved: "Reservado",
  sold: "Vendido",
  closed: "Encerrado",
}

// D6: custo ausente nunca vira R$ 0,00 nem entra em soma — vira este rótulo.
export const LISTING_COST_UNINFORMED_LABEL = "Consultar anunciante"

/**
 * D6 com a leitura da prancha 19: o "total informado" soma SOMENTE os custos
 * presentes; sem aluguel informado não há total nenhum.
 */
export function informedTotalCents(
  rent: number | null,
  condo: number | null,
  iptu: number | null,
): number | null {
  if (rent === null) return null
  return rent + (condo ?? 0) + (iptu ?? 0)
}
