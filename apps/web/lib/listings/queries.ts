// RECON-027 — leitura de Moradia. Toda função recebe o cliente autenticado;
// quem decide o que é visível é a RLS (`private.can_read_listing`), não esta
// camada. Um erro de leitura é lançado, nunca convertido em lista vazia — a
// regra da casa: falha de query não vira "estado vazio".

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import type { ListingAlert } from "./alerts"
import type { ListingFilters } from "./filters"
import type { ListingDeal, ListingStatus, PropertyType } from "./types"

type Client = SupabaseClient<Database>

export interface PropertySummary {
  id: string
  title: string
  status: ListingStatus
  neighborhood: string | null
  cityName: string | null
  stateCode: string | null
  coverPath: string | null
  deal: ListingDeal
  rentCents: number | null
  condoFeeCents: number | null
  salePriceCents: number | null
  bedrooms: number | null
  suites: number | null
  parkingSpots: number | null
  areaM2: number | null
  createdAt: string
}

export interface PropertyDetail extends PropertySummary {
  description: string | null
  iptuCents: number | null
  propertyType: PropertyType
  amenities: string[]
  availableFrom: string | null
  ownerUserId: string
  ownerName: string | null
  audienceLabel: string
  /** Por escolha de quem anuncia; null quando não informado. */
  address: string | null
  photos: { id: string; path: string }[]
}

interface RawRow {
  id: string
  title: string
  description: string | null
  status: ListingStatus
  neighborhood: string | null
  owner_user_id: string
  created_at: string
  address: string | null
  localities: { city_name: string; state_code: string } | null
  communities: { name: string } | null
  property_details: {
    deal: ListingDeal
    property_type: PropertyType
    rent_cents: number | null
    condo_fee_cents: number | null
    iptu_cents: number | null
    sale_price_cents: number | null
    bedrooms: number | null
    suites: number | null
    parking_spots: number | null
    area_m2: number | null
    amenities: string[] | null
    available_from: string | null
  } | null
  listing_photos: { id: string; path: string; position: number }[] | null
}

// `property_details!inner` faz o filtro do satélite excluir o anúncio que não
// casa — sem o `!inner`, o PostgREST filtraria só o embed e a contagem mentiria.
const SELECT =
  "id, title, description, status, neighborhood, owner_user_id, created_at, address, " +
  "localities(city_name, state_code), communities(name), " +
  "property_details!inner(deal, property_type, rent_cents, condo_fee_cents, iptu_cents, " +
  "sale_price_cents, bedrooms, suites, parking_spots, area_m2, amenities, available_from), " +
  "listing_photos(id, path, position)"

function toSummary(row: RawRow): PropertySummary {
  const details = row.property_details
  const photos = [...(row.listing_photos ?? [])].sort((a, b) => a.position - b.position)
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    neighborhood: row.neighborhood,
    cityName: row.localities?.city_name ?? null,
    stateCode: row.localities?.state_code ?? null,
    coverPath: photos[0]?.path ?? null,
    deal: details?.deal ?? "rent",
    rentCents: details?.rent_cents ?? null,
    condoFeeCents: details?.condo_fee_cents ?? null,
    salePriceCents: details?.sale_price_cents ?? null,
    bedrooms: details?.bedrooms ?? null,
    suites: details?.suites ?? null,
    parkingSpots: details?.parking_spots ?? null,
    areaM2: details?.area_m2 ?? null,
    createdAt: row.created_at,
  }
}

/**
 * De que cidade é a busca. Desde a consulta a outra cidade (migration
 * 20260925161111), a RLS deixa qualquer membro verificado LER imóvel de
 * alcance cidade de qualquer cidade — então a cidade não pode mais vir só da
 * RLS: toda busca diz de qual cidade é. `withCommunities` soma os imóveis das
 * comunidades do membro (a RLS decide quais), o que só faz sentido na própria
 * cidade; na consulta, só o alcance cidade daquela cidade.
 */
export interface PropertyScope {
  localityId: string
  withCommunities: boolean
}

// A busca da prancha 65. Só anúncio ativo de Moradia, filtrado no servidor pelo
// mesmo critério exibido na tela. A contagem usa os MESMOS filtros da lista.
export async function searchProperties(
  client: Client,
  filters: ListingFilters,
  scope: PropertyScope,
): Promise<{ rows: PropertySummary[]; count: number }> {
  let query = client
    .from("listings")
    .select(SELECT, { count: "exact" })
    .eq("kind", "property")
    .eq("status", "active")

  query = scope.withCommunities
    ? query.or(`locality_id.eq.${scope.localityId},community_id.not.is.null`)
    : query.eq("locality_id", scope.localityId)

  if (filters.search) query = query.ilike("title", `%${filters.search}%`)
  if (filters.neighborhood) query = query.ilike("neighborhood", `%${filters.neighborhood}%`)
  if (filters.deal) query = query.eq("property_details.deal", filters.deal)
  if (filters.propertyType) query = query.eq("property_details.property_type", filters.propertyType)
  if (filters.minBedrooms !== null)
    query = query.gte("property_details.bedrooms", filters.minBedrooms)
  if (filters.maxValueCents !== null) {
    const column = filters.deal === "sale" ? "sale_price_cents" : "rent_cents"
    query = query.lte(`property_details.${column}`, filters.maxValueCents)
  }

  const { data, error, count } = await query.order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Falha ao buscar imóveis: ${error.message}`)
  }

  const rows = ((data ?? []) as unknown as RawRow[])
    .filter((row) => row.property_details !== null)
    .map(toSummary)
  return { rows, count: count ?? rows.length }
}

// URL assinada curta para o bucket privado. A policy de select do storage
// reconfere o acesso ao anúncio — a assinatura não é uma segunda autorização.
export async function signPhotoPaths(
  client: Client,
  paths: string[],
): Promise<Map<string, string>> {
  const signed = new Map<string, string>()
  for (const path of paths) {
    const { data } = await client.storage.from("listing-photos").createSignedUrl(path, 3600)
    if (data?.signedUrl) signed.set(path, data.signedUrl)
  }
  return signed
}

export async function getSavedListingIds(client: Client, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set()
  const { data, error } = await client
    .from("listing_saves")
    .select("listing_id")
    .in("listing_id", ids)
  if (error) {
    throw new Error(`Falha ao carregar os anúncios salvos: ${error.message}`)
  }
  return new Set((data ?? []).map((row) => row.listing_id))
}

export async function isListingSaved(client: Client, id: string): Promise<boolean> {
  const { data, error } = await client
    .from("listing_saves")
    .select("listing_id")
    .eq("listing_id", id)
    .maybeSingle()
  if (error) {
    throw new Error(`Falha ao carregar o anúncio salvo: ${error.message}`)
  }
  return data !== null
}

export async function getPropertyDetail(
  client: Client,
  id: string,
): Promise<PropertyDetail | null> {
  const { data, error } = await client.from("listings").select(SELECT).eq("id", id).maybeSingle()

  if (error) {
    throw new Error(`Falha ao carregar o imóvel: ${error.message}`)
  }
  if (data === null) return null

  const row = data as unknown as RawRow
  if (row.property_details === null) return null

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("display_name")
    .eq("user_id", row.owner_user_id)
    .maybeSingle()

  if (profileError) {
    throw new Error(`Falha ao carregar o anunciante: ${profileError.message}`)
  }

  const summary = toSummary(row)
  const photos = [...(row.listing_photos ?? [])].sort((a, b) => a.position - b.position)

  return {
    ...summary,
    description: row.description,
    address: row.address,
    iptuCents: row.property_details.iptu_cents,
    propertyType: row.property_details.property_type,
    amenities: row.property_details.amenities ?? [],
    availableFrom: row.property_details.available_from,
    ownerUserId: row.owner_user_id,
    ownerName: (profile as { display_name: string } | null)?.display_name ?? null,
    audienceLabel: row.communities?.name
      ? `Comunidade — ${row.communities.name}`
      : `Toda a cidade — ${summary.cityName ?? "cidade"}${summary.stateCode ? `, ${summary.stateCode}` : ""}`,
    photos: photos.map((photo) => ({ id: photo.id, path: photo.path })),
  }
}

// As assinaturas do próprio usuário. A RLS (`listing_alerts_select_owner`)
// devolve só o que é dele — a tela não filtra por conta própria.
export async function listListingAlerts(client: Client): Promise<ListingAlert[]> {
  const { data, error } = await client
    .from("listing_alerts")
    .select(
      "id, name, kind, locality_id, neighborhood, deal, max_value_cents, min_bedrooms, is_active, created_at",
    )
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Falha ao carregar os alertas: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    localityId: row.locality_id,
    neighborhood: row.neighborhood,
    deal: row.deal,
    maxValueCents: row.max_value_cents,
    minBedrooms: row.min_bedrooms,
    isActive: row.is_active,
    createdAt: row.created_at,
  }))
}
