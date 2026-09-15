// RECON-021 / spec R20 — grouped results for the header search.
//
// Only types that already have a working route and an authorized query appear:
// Guia (approved arrival_guide_entries), Serviços (search_providers RPC) and
// Eventos (non-cancelled upcoming events). Mercado and Moradia have no route
// yet, so they never appear as functional results — the contract forbids
// showing a module that is not integrated.

import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@bivaque/domain"

export const GROUP_PREVIEW_LIMIT = 3

export type SearchGroupKey = "guia" | "servicos" | "eventos"

export interface SearchItem {
  key: string
  title: string
  snippet: string | null
  meta: string | null
  href: string
}

export interface SearchGroup {
  key: SearchGroupKey
  label: string
  total: number
  items: SearchItem[]
  verTodosHref: string
}

export interface ProviderHit {
  id: string
  display_name: string
  category: ProviderCategory
  bio: string | null
}

export interface GuideHit {
  id: string
  name: string
  description: string | null
  category: "school" | "hospital" | "transporter" | "courier"
}

export interface EventHit {
  id: string
  title: string
  description: string | null
  starts_at: string
  venue: string | null
}

const GUIDE_CATEGORY_LABELS: Record<GuideHit["category"], string> = {
  school: "Colégio",
  hospital: "Hospital",
  transporter: "Transportadora",
  courier: "Despachante",
}

const GROUP_ORDER: SearchGroupKey[] = ["guia", "servicos", "eventos"]

const GROUP_LABELS: Record<SearchGroupKey, string> = {
  guia: "Guia da cidade",
  servicos: "Serviços",
  eventos: "Eventos",
}

export function snippet(text: string | null, max = 140): string | null {
  const trimmed = text?.trim()
  if (!trimmed) return null
  if (trimmed.length <= max) return trimmed
  const cut = trimmed.slice(0, max)
  const lastSpace = cut.lastIndexOf(" ")
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

export function matchesTerm(term: string, fields: (string | null | undefined)[]): boolean {
  const needle = term.toLowerCase()
  return fields.some((field) => (field ?? "").toLowerCase().includes(needle))
}

export function formatEventDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })
}

export interface GroupSources {
  term: string
  providers: ProviderHit[]
  guideEntries: GuideHit[]
  events: EventHit[]
}

export function buildSearchGroups({
  term,
  providers,
  guideEntries,
  events,
}: GroupSources): SearchGroup[] {
  const encoded = encodeURIComponent(term)
  const guiaItems: SearchItem[] = guideEntries
    .filter((entry) => matchesTerm(term, [entry.name, entry.description]))
    .map((entry) => ({
      key: `guia-${entry.id}`,
      title: entry.name,
      snippet: snippet(entry.description),
      meta: GUIDE_CATEGORY_LABELS[entry.category] ?? null,
      href: `/guide?q=${encoded}`,
    }))

  // The RPC already matched the term (trigram + ilike on display_name) under
  // can_see_provider; re-filtering with includes() would drop fuzzy hits and
  // lie about the count, so every returned row is used.
  const servicosItems: SearchItem[] = providers.map((provider) => ({
    key: `servicos-${provider.id}`,
    title: provider.display_name,
    snippet: snippet(provider.bio),
    meta: PROVIDER_CATEGORY_LABELS[provider.category] ?? null,
    href: `/prestadores/${provider.id}`,
  }))

  const eventosItems: SearchItem[] = events
    .filter((event) => matchesTerm(term, [event.title, event.description]))
    .map((event) => ({
      key: `eventos-${event.id}`,
      title: event.title,
      snippet: snippet(event.description),
      meta: formatEventDate(event.starts_at) || null,
      href: `/events/${event.id}`,
    }))

  const byKey: Record<SearchGroupKey, SearchItem[]> = {
    guia: guiaItems,
    servicos: servicosItems,
    eventos: eventosItems,
  }
  const verTodos: Record<SearchGroupKey, string> = {
    guia: `/guide?q=${encoded}`,
    servicos: `/explorar/servicos?q=${encoded}`,
    // The events domain has no term filter (prancha 48 defines only the
    // period tabs) — the destination is real, the term handoff is a declared
    // pending in the card, not an invented link that drops a parameter.
    eventos: "/events",
  }

  return GROUP_ORDER.map((key) => ({
    key,
    label: GROUP_LABELS[key],
    total: byKey[key].length,
    items: byKey[key].slice(0, GROUP_PREVIEW_LIMIT),
    verTodosHref: verTodos[key],
  })).filter((group) => group.total > 0)
}
