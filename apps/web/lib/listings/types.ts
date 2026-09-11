// RECON-027 — domínio de anúncio (Mercado e Moradia), conforme
// ADR-20260909-anuncios-mercado-e-moradia. Este arquivo é lógica pura: sem
// acesso a banco, sem React. As telas e as Server Actions consomem daqui.

export type ListingKind = "item" | "property"
export type ListingStatus = "draft" | "active" | "paused" | "reserved" | "sold" | "closed"
export type ListingDeal = "rent" | "sale"
export type PropertyType = "apartment" | "house" | "studio" | "room" | "land" | "commercial"
export type ListingCondition = "new" | "used"

export const LISTING_KIND_LABELS: Record<ListingKind, string> = {
  item: "Produto",
  property: "Imóvel",
}

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  paused: "Pausado",
  reserved: "Reservado",
  sold: "Vendido",
  closed: "Encerrado",
}

export const LISTING_DEAL_LABELS: Record<ListingDeal, string> = {
  rent: "Aluguel",
  sale: "Venda",
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: "Apartamento",
  house: "Casa",
  studio: "Kitnet/Studio",
  room: "Quarto",
  land: "Terreno",
  commercial: "Comercial",
}

export const LISTING_CONDITION_LABELS: Record<ListingCondition, string> = {
  new: "Novo",
  used: "Usado",
}

export const PROPERTY_AMENITIES = [
  "Piscina",
  "Academia",
  "Salão de festas",
  "Portaria 24h",
  "Churrasqueira",
  "Playground",
  "Elevador",
  "Aceita pets",
] as const

// Espelha o check de `listings.title` na migration.
export const TITLE_MIN = 2
export const TITLE_MAX = 120
// Espelha o limite do bucket de mídia (10 MB) e o teto da prancha 65 (12 fotos).
export const MAX_LISTING_PHOTOS = 12
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
