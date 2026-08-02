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

export const PROHIBITED_CONTENT_PATTERN =
  /(an[ôo]nimo|v[íi]deo|marketplace|comercial|venda|compr[oa]|IA gerad[oa]|gerad[oa] por IA|intelig[êe]ncia artificial|verificado publicamente|selo de verifica[çc][ãa]o|organiza[çc][ãa]o militar|\bOM\b|patente|posto militar|gradua[çc][ãa]o militar|endere[çc]o residencial|\bCEP\b|\bCPF\b)/i
