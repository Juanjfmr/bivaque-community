import type { ListingsClient } from "./client"

// Novidades do Mercado para a Home: os anúncios ativos mais recentes que o
// membro alcança. O filtro de público é o MESMO de /mercado (cidade pela
// locality, comunidades pelas FKs) e a RLS decide de novo no servidor.
//
// "Destaque" aqui quer dizer "recente com foto primeiro", não anúncio pago ou
// curado: não existe coluna para isso, e criar uma é decisão de monetização.

export const MARKET_HIGHLIGHTS_LIMIT = 8

export interface MarketHighlight {
  id: string
  title: string
  priceCents: number
  neighborhood: string
  photoUrl: string | null
}

export type MarketHighlightsOutcome =
  | { status: "ready"; items: MarketHighlight[] }
  | { status: "error" }

interface HighlightRow {
  id: string
  title: string
  price_cents: number
  neighborhood: string
}

interface PhotoRow {
  listing_id: string
  path: string
  position: number
}

/** Primeira foto (menor `position`) de cada anúncio. */
export function firstPhotoPathByListing(rows: readonly PhotoRow[]): Map<string, string> {
  const sorted = [...rows].sort((a, b) => a.position - b.position)
  const first = new Map<string, string>()
  for (const row of sorted) {
    if (!first.has(row.listing_id)) first.set(row.listing_id, row.path)
  }
  return first
}

/** Com foto primeiro, preservando a ordem de recência dentro de cada grupo. */
export function photosFirst(items: readonly MarketHighlight[]): MarketHighlight[] {
  return [
    ...items.filter((item) => item.photoUrl !== null),
    ...items.filter((item) => item.photoUrl === null),
  ]
}

export async function loadMarketHighlights(
  supabase: ListingsClient,
  localityId: string,
  communityIds: readonly string[],
): Promise<MarketHighlightsOutcome> {
  try {
    let query = supabase
      .from("listings")
      .select("id,title,price_cents,neighborhood")
      .eq("status", "active")
      .eq("kind", "item")
    query =
      communityIds.length > 0
        ? query.or(`locality_id.eq.${localityId},community_id.in.(${communityIds.join(",")})`)
        : query.eq("locality_id", localityId)

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(MARKET_HIGHLIGHTS_LIMIT)
    if (error) return { status: "error" }

    const rows = (data ?? []) as HighlightRow[]
    if (rows.length === 0) return { status: "ready", items: [] }

    const { data: photoRows, error: photoError } = await supabase
      .from("listing_photos")
      .select("listing_id,path,position")
      .in(
        "listing_id",
        rows.map((row) => row.id),
      )
    // Sem foto não é falha do módulo: o card mostra o recuo.
    const firstPaths = photoError
      ? new Map<string, string>()
      : firstPhotoPathByListing((photoRows ?? []) as PhotoRow[])

    const urlByPath = new Map<string, string>()
    const paths = Array.from(firstPaths.values())
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage
        .from("listing-photos")
        .createSignedUrls(paths, 3600)
      for (const entry of signed ?? []) {
        if (entry.path !== null && entry.signedUrl !== null) {
          urlByPath.set(entry.path, entry.signedUrl)
        }
      }
    }

    const items = rows.map((row) => {
      const path = firstPaths.get(row.id)
      return {
        id: row.id,
        title: row.title,
        priceCents: row.price_cents,
        neighborhood: row.neighborhood,
        photoUrl: path === undefined ? null : (urlByPath.get(path) ?? null),
      }
    })
    return { status: "ready", items: photosFirst(items) }
  } catch {
    return { status: "error" }
  }
}
