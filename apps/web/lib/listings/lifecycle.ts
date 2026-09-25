// RECON-026 — ciclo de vida do anúncio, em lógica pura. Sem I/O e sem React,
// para ser provada por teste unitário antes de qualquer tela. A lista de
// transições espelha exatamente a validação da função `public.transition_listing`
// (migration 20260911043436_listing_lifecycle.sql): o servidor é a autoridade,
// a tela apenas não oferece o que o servidor recusaria.

import { validateAddress } from "./address"
import {
  isListingCategory,
  isNeighborhoodLike,
  type ListingCategory,
  type ListingCondition,
  MAX_LISTING_PRICE_CENTS,
  parsePriceInput,
  toCanonicalCondition,
} from "./catalog"

export const LISTING_STATUSES = ["draft", "active", "paused", "reserved", "sold", "closed"] as const

export type ListingStatus = (typeof LISTING_STATUSES)[number]

export const LISTING_ACTIONS = [
  "publish",
  "pause",
  "reactivate",
  "reserve",
  "sell",
  "close",
] as const

export type ListingAction = (typeof LISTING_ACTIONS)[number]

export const STATUS_LABELS: Record<ListingStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  paused: "Pausado",
  reserved: "Reservado",
  sold: "Vendido",
  closed: "Encerrado",
}

export const ACTION_LABELS: Record<ListingAction, string> = {
  publish: "Publicar anúncio",
  pause: "Pausar anúncio",
  reactivate: "Reativar anúncio",
  reserve: "Marcar como reservado",
  sell: "Marcar como vendido",
  close: "Encerrar anúncio",
}

export const ACTION_TARGET: Record<ListingAction, ListingStatus> = {
  publish: "active",
  pause: "paused",
  reactivate: "active",
  reserve: "reserved",
  sell: "sold",
  close: "closed",
}

// Espelha a guarda do servidor. `closed` é terminal; `draft` só publica;
// `reserved`/`sold` voltam a `active` enquanto não encerrados.
export const ALLOWED_TRANSITIONS: Record<ListingStatus, readonly ListingAction[]> = {
  draft: ["publish"],
  active: ["pause", "reserve", "sell", "close"],
  paused: ["reactivate", "close"],
  reserved: ["reactivate", "sell", "close"],
  sold: ["reactivate", "close"],
  closed: [],
}

export function isListingStatus(value: string): value is ListingStatus {
  return (LISTING_STATUSES as readonly string[]).includes(value)
}

export function statusLabel(status: string): string {
  return isListingStatus(status) ? STATUS_LABELS[status] : "Anúncio"
}

export function allowedActions(status: string): readonly ListingAction[] {
  return isListingStatus(status) ? ALLOWED_TRANSITIONS[status] : []
}

export function canTransition(status: string, action: ListingAction): boolean {
  return allowedActions(status).includes(action)
}

// Índice de chip por situação. A tela traduz em classe/token.
export function statusTone(status: string): "active" | "attention" | "done" | "muted" {
  if (status === "active") return "active"
  if (status === "reserved" || status === "paused") return "attention"
  if (status === "sold" || status === "closed") return "done"
  return "muted"
}

// ── abas da prancha 21 ───────────────────────────────────────────────────────
// A prancha desenha três abas: Ativos, Reservados e Encerrados. A prancha é
// canônica; para que todo estado do ADR D2 seja alcançável, `draft` e `paused`
// ficam no grupo Ativos (o conjunto vivo que o dono gerencia), com o chip da
// linha revelando a situação exata, e `sold` cai em Encerrados.

export const LISTING_TABS = [
  { key: "active", label: "Ativos" },
  { key: "reserved", label: "Reservados" },
  { key: "closed", label: "Encerrados" },
] as const

export type ListingTabKey = (typeof LISTING_TABS)[number]["key"]

export function statusGroup(status: string): ListingTabKey {
  if (status === "reserved") return "reserved"
  if (status === "sold" || status === "closed") return "closed"
  return "active"
}

export function tabCounts(statuses: readonly string[]): Record<ListingTabKey, number> {
  const counts: Record<ListingTabKey, number> = { active: 0, reserved: 0, closed: 0 }
  for (const status of statuses) counts[statusGroup(status)] += 1
  return counts
}

// ── disponibilidade e retirada ───────────────────────────────────────────────

const SHORT_DATE = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" })
const LONG_DATE = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" })

export function parseIsoDate(value: string | null): Date | null {
  if (value === null || value.trim() === "") return null
  const trimmed = value.trim()
  // Coluna `date` chega como "YYYY-MM-DD"; construir em horário local evita o
  // deslocamento de um dia que `new Date("YYYY-MM-DD")` (UTC) produziria.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  const parsed =
    dateOnly === null
      ? new Date(trimmed)
      : new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

// Coluna `Retirada` da tabela: "Até 20 out" ou "A combinar".
export function formatAvailableUntilShort(value: string | null): string {
  const date = parseIsoDate(value)
  return date === null ? "A combinar" : `Até ${SHORT_DATE.format(date)}`
}

// Linha `Disponível até` do rail: "20 de outubro" ou "A combinar".
export function formatAvailableUntilLong(value: string | null): string {
  const date = parseIsoDate(value)
  return date === null ? "A combinar" : LONG_DATE.format(date)
}

// `Retirada` nunca é inferida: sem dado, "a combinar" é a verdade.
export function pickupLabel(note: string | null): string {
  const trimmed = (note ?? "").trim()
  return trimmed === "" ? "a combinar" : trimmed
}

export function formatPublishedAt(value: string | null): string {
  const date = parseIsoDate(value)
  return date === null ? "Rascunho" : SHORT_DATE.format(date)
}

// ── validação da edição ──────────────────────────────────────────────────────
// O público e o dono são imutáveis (ADR D3): a edição não os carrega. Foto,
// título, categoria, preço, condição, descrição e bairro são os campos reais.

export interface ListingEditDraft {
  title: string
  category: string
  priceInput: string
  condition: string
  description: string
  neighborhood: string
  /** Opcional: vazio apaga o endereço. */
  address?: string
}

export interface ValidatedListingEdit {
  title: string
  category: ListingCategory
  condition: ListingCondition
  description: string
  neighborhood: string
  address: string | null
  priceCents: number
}

export type ListingEditField =
  | "title"
  | "category"
  | "price"
  | "condition"
  | "description"
  | "neighborhood"
  | "address"

export type ListingEditErrors = Partial<Record<ListingEditField, string>>

export type ListingEditValidation =
  | { ok: true; value: ValidatedListingEdit }
  | { ok: false; errors: ListingEditErrors }

// Linha gerenciável do anúncio. Único ponto que conhece as colunas que as telas
// de gestão leem — a lista e a edição importam daqui para não divergir.
export interface ManagedListingRow {
  id: string
  owner_user_id: string
  title: string
  description: string
  category: string
  price_cents: number
  condition: string
  neighborhood: string
  status: string
  locality_id: string | null
  community_id: string | null
  created_at: string
  published_at: string | null
  available_until: string | null
  pickup_note: string | null
  address: string | null
  updated_at: string
}

export const MANAGED_LISTING_SELECT =
  "id,owner_user_id,title,description,category,price_cents,condition,neighborhood,status,locality_id,community_id,created_at,published_at,available_until,pickup_note,address,updated_at"

export function validateListingEdit(draft: ListingEditDraft): ListingEditValidation {
  const errors: ListingEditErrors = {}

  const title = draft.title.trim()
  if (title.length < 3) errors.title = "O título precisa de pelo menos 3 caracteres."
  else if (title.length > 120) errors.title = "O título passa de 120 caracteres."

  if (!isListingCategory(draft.category)) errors.category = "Escolha uma categoria."

  const price = parsePriceInput(draft.priceInput)
  if (price === "invalid") errors.price = "Informe um valor como 650 ou 650,00."
  else if (price === null) errors.price = "Informe o preço do item."
  else if (price > MAX_LISTING_PRICE_CENTS) errors.price = "O valor informado é alto demais."

  const condition = toCanonicalCondition(draft.condition)
  if (condition === null) errors.condition = "Escolha a condição do item."

  const description = draft.description.trim()
  if (description.length === 0) errors.description = "Descreva o item."
  else if (description.length > 2000) errors.description = "A descrição passa de 2000 caracteres."

  const neighborhood = draft.neighborhood.trim()
  if (neighborhood.length === 0) errors.neighborhood = "Informe o bairro."
  else if (neighborhood.length > 80) errors.neighborhood = "O bairro passa de 80 caracteres."
  else if (!isNeighborhoodLike(neighborhood)) {
    errors.neighborhood = "Use só o bairro aqui. O endereço tem campo próprio, logo abaixo."
  }

  // Endereço: opcional, por escolha de quem anuncia (migration 20260925174442).
  const address = validateAddress(draft.address)
  if (!address.ok) errors.address = address.error

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  if (
    !isListingCategory(draft.category) ||
    condition === null ||
    typeof price !== "number" ||
    !address.ok
  ) {
    return { ok: false, errors: { category: "Confira os campos do anúncio." } }
  }

  return {
    ok: true,
    value: {
      title,
      category: draft.category,
      condition,
      description,
      neighborhood,
      address: address.value,
      priceCents: price,
    },
  }
}
