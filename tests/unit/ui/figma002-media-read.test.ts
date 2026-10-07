import { beforeEach, describe, expect, it, vi } from "vitest"

const fixture = vi.hoisted(() => ({
  authenticated: true,
  listing: true,
  media: true,
  downloadError: false,
  download: vi.fn(),
  queried: vi.fn(),
}))
vi.mock("../../../apps/web/lib/listings/server", () => ({
  createUserClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: fixture.authenticated ? { id: "caller" } : null },
        error: null,
      }),
    },
    from: (table: string) => {
      fixture.queried(table)
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({
          error: null,
          data:
            table === "listings"
              ? fixture.listing
                ? { id: listingId }
                : null
              : fixture.media
                ? { object_path: `${listingId}/fixture.png`, mime_type: "image/png", byte_size: 3 }
                : null,
        }),
      }
      return query
    },
    storage: { from: () => ({ download: fixture.download }) },
  }),
}))

import { listingMediaUrl, readListingMedia } from "../../../apps/web/lib/listings/media-read"

const listingId = "81000000-0000-4000-8000-00000000e201"
const mediaId = "81000000-0000-4000-8000-00000000e202"
beforeEach(() => {
  fixture.authenticated = true
  fixture.listing = true
  fixture.media = true
  fixture.download
    .mockReset()
    .mockResolvedValue({ data: new Blob([new Uint8Array([1, 2, 3])]), error: null })
  fixture.queried.mockClear()
})
describe("authenticated listing bytes", () => {
  it("returns actual bytes privately without signing or redirecting", async () => {
    const response = await readListingMedia(listingId, mediaId)
    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(response.headers.get("Content-Type")).toBe("image/png")
    expect(response.headers.has("Location")).toBe(false)
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3])
    expect(listingMediaUrl(listingId, mediaId)).toBe(`/imoveis/${listingId}/midia/${mediaId}`)
  })
  it.each(["session", "listing", "media", "storage"])(
    "uses the same metadata-free denial for %s",
    async (failure) => {
      if (failure === "session") fixture.authenticated = false
      if (failure === "listing") fixture.listing = false
      if (failure === "media") fixture.media = false
      if (failure === "storage")
        fixture.download.mockResolvedValue({ data: null, error: new Error("denied") })
      const response = await readListingMedia(listingId, mediaId)
      expect(response.status).toBe(404)
      expect(await response.text()).toBe("Foto não disponível.")
      expect(response.headers.get("Cache-Control")).toBe("private, no-store")
      expect(response.headers.get("Content-Type")).not.toBe("image/png")
      if (failure !== "storage") expect(fixture.download).not.toHaveBeenCalled()
    },
  )
  it("rejects invalid IDs before accessing the database", async () => {
    expect((await readListingMedia("bad", mediaId)).status).toBe(404)
    expect(fixture.queried).not.toHaveBeenCalled()
  })
})
