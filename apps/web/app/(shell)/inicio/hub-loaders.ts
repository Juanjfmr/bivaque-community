// O Início como "grande atalho" (25/09/2026): uma leitura curta de cada vertical
// para a Home mostrar o que está acontecendo no Bivaque inteiro. Mesmas regras
// de home-loaders.ts:
//
// - Nenhum loader rejeita. Falha vira { status: "error" } e a seção mostra um
//   estado recuperável — nunca lista vazia fingindo que não há nada.
// - Cada leitura usa o MESMO canal da página da vertical (mesma tabela, mesmos
//   filtros de status); quem decide a visibilidade continua sendo a RLS.
// - Contagem é por linhas lidas com teto, não HEAD: a pilha local não responde
//   HTTP HEAD (prova de runtime de 08/09, registrada em home-loaders.ts).

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { headlinePrice } from "../../../lib/listings/costs"
import type { ListingFilters } from "../../../lib/listings/filters"
import { type PropertyScope, searchProperties } from "../../../lib/listings/queries"
import { GUIDE_CATEGORY_LABELS } from "../../../lib/recommendations/guide-search"
import { NOVELTY_MAX_DAYS } from "./novelty"

type HubClient = SupabaseClient<Database>

export type Loaded<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T }

type Outcome<T> = { status: "error" } | { status: "ready"; data: T }

/** Horizonte do "Esta semana": o carrossel olha duas semanas, o contador uma. */
export const EVENTS_HORIZON_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_MS = 7 * DAY_MS
/** Janela das leituras de novidade: a mesma de novelty.ts, que nunca olha além. */
const NOVELTY_WINDOW_MS = NOVELTY_MAX_DAYS * DAY_MS
/** Teto das leituras de contagem: acima disso o número vira "N+". */
export const COUNT_CAP = 50

export interface HubEvent {
  id: string
  title: string
  startsAt: string
  venue: string | null
}

export interface HubQuestion {
  id: string
  title: string
  createdAt: string
}

/** Até COUNT_CAP perguntas abertas: as três primeiras aparecem, as datas contam. */
export interface HubQuestions {
  items: HubQuestion[]
  count: number
  createdAts: string[]
}

/** Lista curta que aparece + as datas de tudo que foi lido, para a novidade. */
export interface WithTimes<T> {
  items: T[]
  createdAts: string[]
}

export interface HubGuideEntry {
  id: string
  name: string
  categoryLabel: string
}

export interface HubProperty {
  id: string
  title: string
  priceLabel: string
  neighborhood: string | null
  bedrooms: number | null
  photoUrl: string | null
}

// ── Puras (testadas sem rede) ────────────────────────────────────────────────

/** Quantos encontros começam nos próximos 7 dias a partir de `now`. */
export function countThisWeek(events: readonly HubEvent[], now: Date): number {
  const limit = now.getTime() + WEEK_MS
  return events.filter((event) => {
    const start = Date.parse(event.startsAt)
    return start >= now.getTime() && start < limit
  }).length
}

/** "12", ou "50+" quando a leitura bateu no teto. */
export function formatCount(count: number): string {
  return count >= COUNT_CAP ? `${COUNT_CAP}+` : String(count)
}

export function guideCategoryLabel(category: string): string {
  return GUIDE_CATEGORY_LABELS[category] ?? "Guia"
}

// ── Leituras ─────────────────────────────────────────────────────────────────

export async function loadUpcomingEvents(
  supabase: HubClient,
  localityId: string,
  now: Date = new Date(),
): Promise<Outcome<HubEvent[]>> {
  try {
    const horizon = new Date(now.getTime() + EVENTS_HORIZON_DAYS * 24 * 60 * 60 * 1000)
    const { data, error } = await supabase
      .from("events")
      .select("id, title, starts_at, venue")
      .eq("locality_id", localityId)
      .eq("status", "upcoming")
      .gte("starts_at", now.toISOString())
      .lt("starts_at", horizon.toISOString())
      .order("starts_at", { ascending: true })
      .limit(8)
    if (error) return { status: "error" }
    const rows = (data ?? []) as {
      id: string
      title: string
      starts_at: string
      venue: string | null
    }[]
    return {
      status: "ready",
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        startsAt: row.starts_at,
        venue: row.venue,
      })),
    }
  } catch {
    return { status: "error" }
  }
}

// Perguntas da cidade ainda sem resposta aceita: o convite a ajudar, que dá
// vida à comunidade. Mesmo filtro de /recommendations (não apagada, da cidade).
export async function loadOpenQuestions(
  supabase: HubClient,
  localityId: string,
): Promise<Outcome<HubQuestions>> {
  try {
    const { data, error } = await supabase
      .from("recommendation_requests")
      .select("id, title, created_at")
      .eq("locality_id", localityId)
      .eq("is_deleted", false)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(COUNT_CAP)
    if (error) return { status: "error" }
    const rows = (data ?? []) as { id: string; title: string; created_at: string }[]
    return {
      status: "ready",
      data: {
        count: rows.length,
        createdAts: rows.map((row) => row.created_at),
        items: rows.slice(0, 3).map((row) => ({
          id: row.id,
          title: row.title,
          createdAt: row.created_at,
        })),
      },
    }
  } catch {
    return { status: "error" }
  }
}

// O que entrou no Guia por último: mesmo SELECT de /guide (aprovadas da cidade).
export async function loadGuideNews(
  supabase: HubClient,
  localityId: string,
  /** Quantas aparecem: três no Início, mais na consulta a outra cidade. */
  shown = 3,
): Promise<Outcome<WithTimes<HubGuideEntry>>> {
  try {
    const { data, error } = await supabase
      .from("arrival_guide_entries")
      .select("id, name, category, created_at")
      .eq("locality_id", localityId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(COUNT_CAP)
    if (error) return { status: "error" }
    const rows = (data ?? []) as {
      id: string
      name: string
      category: string
      created_at: string
    }[]
    return {
      status: "ready",
      data: {
        createdAts: rows.map((row) => row.created_at),
        items: rows.slice(0, shown).map((row) => ({
          id: row.id,
          name: row.name,
          categoryLabel: guideCategoryLabel(row.category),
        })),
      },
    }
  } catch {
    return { status: "error" }
  }
}

const NO_FILTERS: ListingFilters = {
  search: null,
  neighborhood: null,
  deal: null,
  maxValueCents: null,
  minBedrooms: null,
  propertyType: null,
  sort: "recent",
}

// Moradia pelo MESMO searchProperties de /imoveis, sem filtro de busca e com a
// cidade explícita (a RLS decide o público dentro dela). Só a capa de cada
// anúncio é assinada.
export async function loadPropertyHighlights(
  supabase: HubClient,
  scope: PropertyScope,
): Promise<Outcome<WithTimes<HubProperty>>> {
  try {
    const { rows } = await searchProperties(supabase, NO_FILTERS, scope)
    const top = rows.slice(0, 6)
    const covers = top.map((row) => row.coverPath).filter((path): path is string => path !== null)
    const urlByPath = new Map<string, string>()
    if (covers.length > 0) {
      const { data: signed } = await supabase.storage
        .from("listing-photos")
        .createSignedUrls(covers, 3600)
      for (const entry of signed ?? []) {
        if (entry.path !== null && entry.signedUrl !== null) {
          urlByPath.set(entry.path, entry.signedUrl)
        }
      }
    }
    return {
      status: "ready",
      data: {
        createdAts: rows.map((row) => row.createdAt),
        items: top.map((row) => ({
          id: row.id,
          title: row.title,
          priceLabel: headlinePrice(row.deal, row),
          neighborhood: row.neighborhood,
          bedrooms: row.bedrooms,
          photoUrl: row.coverPath === null ? null : (urlByPath.get(row.coverPath) ?? null),
        })),
      },
    }
  } catch {
    return { status: "error" }
  }
}

// Datas dos anúncios do Mercado dos últimos 30 dias, com o público de /mercado.
// Quem decide o corte (desde a última visita, ou a semana na primeira visita) é
// a página; a leitura é a mesma nos dois casos.
export async function loadRecentListingTimes(
  supabase: HubClient,
  localityId: string,
  communityIds: readonly string[],
  now: Date = new Date(),
): Promise<Outcome<string[]>> {
  try {
    const since = new Date(now.getTime() - NOVELTY_WINDOW_MS).toISOString()
    let query = supabase
      .from("listings")
      .select("created_at")
      .eq("status", "active")
      .eq("kind", "item")
      .gte("created_at", since)
    query =
      communityIds.length > 0
        ? query.or(`locality_id.eq.${localityId},community_id.in.(${communityIds.join(",")})`)
        : query.eq("locality_id", localityId)
    const { data, error } = await query.order("created_at", { ascending: false }).limit(COUNT_CAP)
    if (error) return { status: "error" }
    return {
      status: "ready",
      data: ((data ?? []) as { created_at: string }[]).map((row) => row.created_at),
    }
  } catch {
    return { status: "error" }
  }
}

/** Na primeira visita não há "desde a última vez": a novidade é a da semana. */
export function weekAgo(now: Date): Date {
  return new Date(now.getTime() - WEEK_MS)
}
