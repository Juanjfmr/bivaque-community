import { LISTING_PROPERTY_TYPES, type ListingPropertyType } from "@bivaque/domain"
import { listingMediaUrl } from "./media-read"
import { createUserClient } from "./server"
import type {
  ListingDetail,
  ListingMediaRow,
  ListingSearchFilters,
  ListingWithDetails,
} from "./types"

// FIGMA-002 — leituras server-side do domínio de anúncios com a sessão real do
// membro: quem alcança o público é a RLS (coluna de escopo + policies da
// migration do lote), nunca um filtro de confiança no cliente. Erro de rede/RLS
// NÃO vira lista vazia: o loader devolve o erro e a tela decide o estado
// recuperável (apps/web/AGENTS.md: failed query rendered as empty list is a bug).

export interface ListarResult {
  listings: ListingWithDetails[]
  error: string | null
  coverUrls: Map<string, string>
  /** Ids já salvos pelo caller, para o estado do botão nos cards. */
  savedIds: Set<string>
}

/**
 * Ids de anúncio que o caller já salvou. A leitura é só da PRÓPRIA relação e
 * falha fechada: sem sessão ou com falha, o conjunto vem vazio e o botão
 * aparece como "Salvar", nunca como salvo sem prova. A RLS garante que ninguém
 * vê os saves de outro membro.
 */
async function loadOwnSavedIds(
  supabase: Awaited<ReturnType<typeof createUserClient>>,
  listingIds: string[],
) {
  if (listingIds.length === 0) return new Set<string>()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Set<string>()
  const { data, error } = await supabase
    .from("listing_saves")
    .select("listing_id")
    .eq("user_id", user.id)
    .in("listing_id", listingIds)
  if (error) return new Set<string>()
  return new Set((data ?? []).map((row) => row.listing_id))
}

export async function searchActivePropertyListings(
  filters: ListingSearchFilters = {},
): Promise<ListarResult> {
  const supabase = await createUserClient()

  let query = supabase
    .from("listings")
    .select("*, property_details!inner(*), listing_media(*)")
    .eq("kind", "property")
    .eq("status", "active")
    .order("created_at", { ascending: false })

  const type = filters.propertyType?.trim()
  if (type && LISTING_PROPERTY_TYPES.includes(type as ListingPropertyType))
    query = query.eq("property_details.property_type", type as ListingPropertyType)

  const text = filters.query?.trim()
  if (text) {
    const safe = text.replace(/[%_,]/g, " ")
    query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`)
  }
  if (filters.neighborhood?.trim()) {
    const safe = filters.neighborhood.trim().replace(/[%_,]/g, " ")
    query = query.ilike("property_details.neighborhood", `%${safe}%`)
  }
  if (
    filters.maxRentCents !== undefined &&
    Number.isSafeInteger(filters.maxRentCents) &&
    filters.maxRentCents >= 0
  )
    query = query.lte("property_details.rent_cents", filters.maxRentCents)
  if (
    filters.minBedrooms !== undefined &&
    Number.isSafeInteger(filters.minBedrooms) &&
    filters.minBedrooms >= 0
  )
    query = query.gte("property_details.bedrooms", filters.minBedrooms)

  const { data, error } = await query
  if (error) {
    return {
      listings: [],
      error: "Não foi possível buscar imóveis agora. Tente novamente.",
      coverUrls: new Map(),
      savedIds: new Set(),
    }
  }
  const rows = (data ?? []) as (ListingWithDetails & { listing_media: ListingMediaRow[] })[]
  const covers = rows.map((row) => ({
    id: row.id,
    photo:
      row.listing_media.find((photo) => photo.is_cover) ??
      [...row.listing_media].sort((a, b) => a.position - b.position)[0],
  }))
  const coverUrls = new Map<string, string>()
  for (const cover of covers) {
    if (cover.photo) coverUrls.set(cover.id, listingMediaUrl(cover.id, cover.photo.id))
  }
  const savedIds = await loadOwnSavedIds(
    supabase,
    rows.map((row) => row.id),
  )
  return { listings: rows, error: null, coverUrls, savedIds }
}

export async function loadOwnDrafts() {
  const supabase = await createUserClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { drafts: [], error: "Entre para retomar seus rascunhos." }
  const { data, error } = await supabase
    .from("listings")
    .select("id,title")
    .eq("owner_user_id", auth.user.id)
    .eq("kind", "property")
    .eq("status", "draft")
    .order("created_at", { ascending: false })
  return { drafts: data ?? [], error: error ? "Não foi possível carregar seus rascunhos." : null }
}

export interface DetailResult {
  listing: ListingDetail | null
  error: string | null
  /** Endpoint de bytes autenticados por caminho; nunca URL assinada. */
  mediaUrls: Map<string, string> | null
  callerIsOwner: boolean
  /** O caller já salvou este anúncio (para o botão Salvar do detalhe). */
  callerSaved: boolean
  /** Ocultação pela moderação: só o dono enxerga a marca e o aviso. */
  callerSeesHiddenWarning: boolean
}

export async function loadListingDetail(listingId: string): Promise<DetailResult> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listingId)) {
    return {
      listing: null,
      error: null,
      mediaUrls: null,
      callerIsOwner: false,
      callerSaved: false,
      callerSeesHiddenWarning: false,
    }
  }
  const supabase = await createUserClient()

  const { data: user } = await supabase.auth.getUser()
  const me = user.user?.id ?? null

  const { data, error } = await supabase
    .from("listings")
    .select("*, property_details(*), listing_media(*)")
    .eq("id", listingId)
    .maybeSingle()

  if (error) {
    return {
      listing: null,
      error: "Não foi possível carregar este anúncio. Tente novamente.",
      mediaUrls: null,
      callerIsOwner: false,
      callerSaved: false,
      callerSeesHiddenWarning: false,
    }
  }
  if (!data) {
    // RLS cala para fora do público (ou id inexistente): a tela explica sem
    // distinguir os dois — fronteira de presença, como na ficha pública.
    return {
      listing: null,
      error: null,
      mediaUrls: null,
      callerIsOwner: false,
      callerSaved: false,
      callerSeesHiddenWarning: false,
    }
  }

  const row = data as ListingWithDetails & { listing_media: ListingMediaRow[] }
  const media = (row.listing_media ?? []).sort((a, b) => a.position - b.position)
  const callerIsOwner = me !== null && row.owner_user_id === me

  const mediaUrls = new Map(
    media.map((item) => [item.object_path, listingMediaUrl(listingId, item.id)]),
  )

  let interestConversationId: string | null = null
  let callerSaved = false
  if (me) {
    const { data: interest } = await supabase
      .from("listing_interests")
      .select("conversation_id")
      .eq("listing_id", listingId)
      .eq("user_id", me)
      .maybeSingle()
    interestConversationId = interest?.conversation_id ?? null
    const { data: ownSave } = await supabase
      .from("listing_saves")
      .select("listing_id")
      .eq("user_id", me)
      .eq("listing_id", listingId)
      .maybeSingle()
    callerSaved = Boolean(ownSave)
  }

  // Session RLS controls the advertiser's profile visibility; never bypass it
  // to fill this section, and do not infer identity/affiliation from listing data.
  const { data: advertiser, error: advertiserError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", row.owner_user_id)
    .maybeSingle()
  let localityId = row.locality_id
  if (!localityId && row.community_id) {
    const { data: community } = await supabase
      .from("communities")
      .select("locality_id")
      .eq("id", row.community_id)
      .maybeSingle()
    localityId = community?.locality_id ?? null
  }
  const city = localityId
    ? await supabase.from("localities").select("city_name").eq("id", localityId).maybeSingle()
    : null
  return {
    listing: {
      ...row,
      details: row.property_details,
      media,
      interestConversationId,
      advertiserName: advertiserError ? null : (advertiser?.display_name ?? null),
      cityName: city?.data?.city_name ?? null,
    },
    error: null,
    mediaUrls,
    callerIsOwner,
    callerSaved,
    // A marca de ocultação só interessa ao dono — ele continua vendo e editando
    // o anúncio. Para terceiro o anúncio nem aparece (a RLS o remove).
    callerSeesHiddenWarning: callerIsOwner && row.moderation_hidden === true,
  }
}

/** Fotos ordenadas de um anúncio para o gerenciador de edição (só o dono chega aqui pela RLS). */
export async function loadOwnerListing(listingId: string): Promise<DetailResult> {
  const result = await loadListingDetail(listingId)
  if (result.listing && !result.callerIsOwner) {
    return {
      listing: null,
      error: null,
      mediaUrls: null,
      callerIsOwner: false,
      callerSaved: false,
      callerSeesHiddenWarning: false,
    }
  }
  return result
}

export interface SavedListResult {
  rows: Array<{
    listingId: string
    savedAt: string
    listing: ListingDetail | null
    mediaUrl: string | null
  }>
  error: string | null
  /** Quantos saves continuam existindo sem acesso ao anúncio. */
  inaccessibleCount: number
}

/**
 * A lista de salvos do membro (ADR-20261006): a relação privada é a fonte, e o
 * anúncio vem do MESMO join autorizado de sempre — sem service_role, sem cópia
 * de título/foto/status guardada na relação.
 *
 * Quando o anúncio deixa de ser alcançável (estado, moderação ou associação),
 * o save continua na lista com id e data e a tela diz que o anúncio não está
 * disponível agora. Não há contador de "quantos salvos sumiram" nem título,
 * foto ou status no lugar: o RLS simplesmente não devolve a linha do anúncio.
 */
export async function loadSavedListings(): Promise<SavedListResult> {
  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { rows: [], error: "Entre para ver seus anúncios salvos.", inaccessibleCount: 0 }
  }

  const { data: saves, error } = await supabase
    .from("listing_saves")
    .select("listing_id, saved_at")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false })

  if (error) {
    return {
      rows: [],
      error: "Não foi possível carregar seus anúncios salvos agora. Tente novamente.",
      inaccessibleCount: 0,
    }
  }

  const ids = (saves ?? []).map((row) => row.listing_id)
  if (ids.length === 0) return { rows: [], error: null, inaccessibleCount: 0 }

  const { data: listings, error: listingsError } = await supabase
    .from("listings")
    .select("*, property_details(*), listing_media(*)")
    .in("id", ids)
  if (listingsError) {
    return {
      rows: [],
      error: "Não foi possível carregar seus anúncios salvos agora. Tente novamente.",
      inaccessibleCount: 0,
    }
  }

  const byId = new Map(
    ((listings ?? []) as (ListingWithDetails & { listing_media: ListingMediaRow[] })[]).map(
      (row) => [row.id, row],
    ),
  )

  let unreachable = 0
  const rows = (saves ?? []).map((save) => {
    const row = byId.get(save.listing_id)
    if (!row) {
      unreachable += 1
      return {
        listingId: save.listing_id,
        savedAt: save.saved_at,
        listing: null,
        mediaUrl: null,
      }
    }
    const cover = row.listing_media.find((photo) => photo.is_cover) ?? row.listing_media[0]
    return {
      listingId: save.listing_id,
      savedAt: save.saved_at,
      listing: {
        ...row,
        details: row.property_details,
        media: row.listing_media,
        interestConversationId: null,
        advertiserName: null,
        cityName: null,
      },
      mediaUrl: cover ? listingMediaUrl(save.listing_id, cover.id) : null,
    }
  })

  return { rows, error: null, inaccessibleCount: unreachable }
}
