import { readListingMedia } from "../../../../../../lib/listings/media-read"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
) {
  const { id, mediaId } = await params
  return readListingMedia(id, mediaId)
}
