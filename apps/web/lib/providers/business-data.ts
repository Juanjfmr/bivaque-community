import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { type BusinessDetails, EMPTY_BUSINESS_DETAILS } from "./business-details"

export async function ownBusinessDetails(client: SupabaseClient<Database>, providerId: string) {
  const { data, error } = await client.rpc("get_own_business_page_details", {
    p_provider_id: providerId,
  })
  if (error) throw new Error("Não foi possível carregar os detalhes privados do negócio.")
  return data ? (data as unknown as BusinessDetails) : null
}

export async function publicBusinessDetails(client: SupabaseClient<Database>, providerId: string) {
  const { data, error } = await client.rpc("get_business_page_details", {
    p_provider_id: providerId,
  })
  if (error) throw new Error("Não foi possível carregar os detalhes do negócio.")
  return data ? (data as unknown as BusinessDetails) : null
}

export async function civilBusinessContact(client: SupabaseClient<Database>, providerId: string) {
  const details = await ownBusinessDetails(client, providerId)
  return details ?? EMPTY_BUSINESS_DETAILS
}

export async function businessContent(client: SupabaseClient<Database>, providerId: string) {
  const [publicDetails, ownDetails] = await Promise.all([
    publicBusinessDetails(client, providerId),
    ownBusinessDetails(client, providerId),
  ])
  if (!publicDetails && !ownDetails)
    throw new Error("O conteúdo deste negócio não está disponível para esta conta.")
  const [catalogResult, photosResult, reachResult] = await Promise.all([
    client
      .from("provider_catalog_items")
      .select("id,title,description,price_cents")
      .eq("provider_id", providerId)
      .order("position"),
    client
      .from("provider_portfolio_photos")
      .select("id,photo_path,caption")
      .eq("provider_id", providerId)
      .order("position"),
    client
      .from("provider_reach")
      .select("scope_id")
      .eq("provider_id", providerId)
      .eq("scope_type", "locality")
      .eq("active", true),
  ])
  if (catalogResult.error || photosResult.error || reachResult.error)
    throw new Error("Não foi possível carregar o conteúdo do negócio.")
  const photos = photosResult.data ?? []
  const signed = photos.length
    ? await client.storage.from("provider-photos").createSignedUrls(
        photos.map((photo) => photo.photo_path),
        3600,
      )
    : null
  if (signed?.error) throw new Error("Não foi possível carregar as fotos do negócio.")
  const photoUrls = new Map((signed?.data ?? []).map((row) => [row.path, row.signedUrl]))
  const localityIds = (reachResult.data ?? []).map((reach) => reach.scope_id)
  const listingsResult = localityIds.length
    ? await client
        .from("listings")
        .select("id,title,price_cents,neighborhood")
        .eq("provider_id", providerId)
        .eq("kind", "item")
        .eq("status", "active")
        .in("locality_id", localityIds)
        .order("published_at", { ascending: false })
    : null
  if (listingsResult?.error) throw new Error("Não foi possível carregar os produtos do negócio.")
  const listings = listingsResult?.data ?? []
  const listingPhotosResult = listings.length
    ? await client
        .from("listing_photos")
        .select("listing_id,path,position")
        .in(
          "listing_id",
          listings.map((listing) => listing.id),
        )
        .order("position")
    : null
  if (listingPhotosResult?.error)
    throw new Error("Não foi possível carregar as fotos dos produtos.")
  const firstPhotos = new Map<string, string>()
  for (const photo of listingPhotosResult?.data ?? [])
    if (!firstPhotos.has(photo.listing_id)) firstPhotos.set(photo.listing_id, photo.path)
  const listingSigned = firstPhotos.size
    ? await client.storage.from("listing-photos").createSignedUrls([...firstPhotos.values()], 3600)
    : null
  if (listingSigned?.error) throw new Error("Não foi possível carregar as fotos dos produtos.")
  const listingUrls = new Map((listingSigned?.data ?? []).map((row) => [row.path, row.signedUrl]))
  return {
    catalog: catalogResult.data ?? [],
    photos: photos.flatMap((photo) => {
      const url = photoUrls.get(photo.photo_path)
      return url ? [{ id: photo.id, url, caption: photo.caption }] : []
    }),
    listings: listings.map((listing) => ({
      ...listing,
      photoUrl: listingUrls.get(firstPhotos.get(listing.id) ?? "") ?? null,
    })),
  }
}

export type BusinessContentData = Awaited<ReturnType<typeof businessContent>>

export async function visibleBusinessNames(client: SupabaseClient<Database>, ids: string[]) {
  const unique = [...new Set(ids)]
  const visible = await Promise.all(
    unique.map(async (id) => {
      const details = await publicBusinessDetails(client, id)
      return details ? id : null
    }),
  )
  const allowed = visible.filter((id): id is string => id !== null)
  if (!allowed.length) return new Map<string, string>()
  const { data, error } = await client
    .from("provider_profiles")
    .select("id,display_name")
    .in("id", allowed)
    .eq("is_deleted", false)
  if (error) throw new Error("Não foi possível carregar os negócios anunciantes.")
  return new Map((data ?? []).map((row) => [row.id, row.display_name]))
}
