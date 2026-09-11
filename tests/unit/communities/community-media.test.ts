import { describe, expect, it } from "vitest"
import {
  COMMUNITY_IMAGE_MAX_BYTES,
  COMMUNITY_IMAGE_MIME_TYPES,
  communityImageAltText,
  communityImagePath,
  isCommunityImageKind,
  parseCommunityImagePath,
  validateCommunityImage,
} from "web/lib/communities/community-media"

const COMMUNITY_ID = "71000000-0000-4000-8000-000000000001"

describe("validateCommunityImage", () => {
  it("accepts every allowed image mime within the 10 MB limit", () => {
    for (const mimeType of COMMUNITY_IMAGE_MIME_TYPES) {
      expect(validateCommunityImage({ mimeType, sizeBytes: 2_000_000 })).toEqual({
        ok: true,
        mimeType,
      })
    }
  })

  it("accepts a file exactly at the limit", () => {
    expect(
      validateCommunityImage({ mimeType: "image/webp", sizeBytes: COMMUNITY_IMAGE_MAX_BYTES }),
    ).toEqual({ ok: true, mimeType: "image/webp" })
  })

  it("rejects a document, a video and an octet stream by mime", () => {
    for (const mimeType of ["application/pdf", "video/mp4", "application/octet-stream"]) {
      expect(validateCommunityImage({ mimeType, sizeBytes: 1000 })).toEqual({
        ok: false,
        reason: "mime",
      })
    }
  })

  it("rejects a file above the limit by size", () => {
    expect(
      validateCommunityImage({ mimeType: "image/jpeg", sizeBytes: COMMUNITY_IMAGE_MAX_BYTES + 1 }),
    ).toEqual({ ok: false, reason: "size" })
  })

  it("rejects empty and negative sizes", () => {
    for (const sizeBytes of [0, -1]) {
      expect(validateCommunityImage({ mimeType: "image/png", sizeBytes })).toEqual({
        ok: false,
        reason: "size",
      })
    }
  })
})

describe("community image path", () => {
  it("is deterministic per community and kind", () => {
    expect(communityImagePath(COMMUNITY_ID, "banner")).toBe(`${COMMUNITY_ID}/banner`)
    expect(communityImagePath(COMMUNITY_ID, "thumbnail")).toBe(`${COMMUNITY_ID}/thumbnail`)
  })

  it("recognises the two kinds", () => {
    expect(isCommunityImageKind("banner")).toBe(true)
    expect(isCommunityImageKind("thumbnail")).toBe(true)
    expect(isCommunityImageKind("cover")).toBe(false)
    expect(isCommunityImageKind("")).toBe(false)
  })

  it("parses a path that lives under the community folder", () => {
    expect(parseCommunityImagePath(COMMUNITY_ID, `${COMMUNITY_ID}/banner`)).toBe(
      `${COMMUNITY_ID}/banner`,
    )
  })

  it("refuses a path from another community, a nested path, an empty leaf or nothing", () => {
    expect(parseCommunityImagePath(COMMUNITY_ID, "other/banner")).toBeNull()
    expect(parseCommunityImagePath(COMMUNITY_ID, `${COMMUNITY_ID}/nested/banner`)).toBeNull()
    expect(parseCommunityImagePath(COMMUNITY_ID, `${COMMUNITY_ID}/`)).toBeNull()
    expect(parseCommunityImagePath(COMMUNITY_ID, null)).toBeNull()
    expect(parseCommunityImagePath(COMMUNITY_ID, "")).toBeNull()
  })
})

describe("community image alt text", () => {
  it("distinguishes banner from thumbnail", () => {
    expect(communityImageAltText("banner")).not.toBe(communityImageAltText("thumbnail"))
  })

  it("describes the community image without repeating a name or naming a person", () => {
    for (const kind of ["banner", "thumbnail"] as const) {
      const alt = communityImageAltText(kind)
      expect(alt.length).toBeGreaterThan(0)
      expect(alt.toLowerCase()).toContain("comunidade")
      expect(alt).not.toMatch(/Bivaque|membro|pessoa/i)
    }
  })
})
