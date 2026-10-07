import { LISTING_PHOTO_MAX_SIZE_BYTES } from "@bivaque/domain"
import { createUserClient } from "./server"

export function listingMediaUrl(listingId: string, mediaId: string): string {
  return `/imoveis/${encodeURIComponent(listingId)}/midia/${encodeURIComponent(mediaId)}`
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie",
}

function unavailable() {
  return new Response("Foto não disponível.", { status: 404, headers })
}

// This endpoint never signs, redirects or optimizes objects. Both the row and
// the byte download use the caller's session/RLS, with no operator exception.
export async function readListingMedia(listingId: string, mediaId: string): Promise<Response> {
  if (!UUID.test(listingId) || !UUID.test(mediaId)) return unavailable()
  try {
    const client = await createUserClient()
    const auth = await client.auth.getUser()
    if (auth.error || !auth.data.user) return unavailable()
    const listing = await client.from("listings").select("id").eq("id", listingId).maybeSingle()
    if (listing.error || !listing.data) return unavailable()
    const media = await client
      .from("listing_media")
      .select("object_path,mime_type,byte_size")
      .eq("id", mediaId)
      .eq("listing_id", listingId)
      .maybeSingle()
    if (media.error || !media.data) return unavailable()
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(media.data.mime_type) ||
      !media.data.object_path.startsWith(`${listingId}/`)
    )
      return unavailable()
    const download = await client.storage.from("listing-photos").download(media.data.object_path)
    if (download.error || !download.data || download.data.size > LISTING_PHOTO_MAX_SIZE_BYTES)
      return unavailable()
    return new Response(download.data, {
      status: 200,
      headers: { ...headers, "Content-Type": media.data.mime_type },
    })
  } catch {
    return unavailable()
  }
}
