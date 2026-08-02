import {
  AvatarUploadSchema,
  EventPhotoUploadSchema,
  StorageImageMimeSchema,
} from "@bivaque/contracts"
import { describe, expect, it } from "vitest"

describe("storage image validation", () => {
  it("accepts jpeg, png, and webp mime types through the boundary schema", () => {
    const accepted = ["image/jpeg", "image/png", "image/webp"] as const

    for (const mime of accepted) {
      expect(StorageImageMimeSchema.parse(mime)).toBe(mime)
    }
  })

  it("rejects a PDF document mime type", () => {
    expect(() => StorageImageMimeSchema.parse("application/pdf")).toThrow()
  })

  it("rejects a video mime type", () => {
    expect(() => StorageImageMimeSchema.parse("video/mp4")).toThrow()
  })

  it("rejects arbitrary non-image mime types", () => {
    expect(() => StorageImageMimeSchema.parse("text/plain")).toThrow()
    expect(() => StorageImageMimeSchema.parse("application/octet-stream")).toThrow()
  })

  it("accepts an avatar fixture within the 5 MB size limit", () => {
    const fixture = { mimeType: "image/jpeg" as const, sizeBytes: 1_048_576 }

    expect(AvatarUploadSchema.parse(fixture)).toEqual(fixture)
  })

  it("rejects an avatar fixture that exceeds the 5 MB size limit", () => {
    const oversize = { mimeType: "image/webp" as const, sizeBytes: 10_000_000 }

    expect(() => AvatarUploadSchema.parse(oversize)).toThrow()
  })

  it("accepts an event photo fixture within the 10 MB size limit", () => {
    const fixture = { mimeType: "image/png" as const, sizeBytes: 5_242_880 }

    expect(EventPhotoUploadSchema.parse(fixture)).toEqual(fixture)
  })

  it("rejects an event photo fixture that exceeds the 10 MB size limit", () => {
    const oversize = { mimeType: "image/jpeg" as const, sizeBytes: 20_000_000 }

    expect(() => EventPhotoUploadSchema.parse(oversize)).toThrow()
  })

  it("rejects an upload with a valid size but disallowed mime type", () => {
    const bad = { mimeType: "application/pdf", sizeBytes: 1_000_000 }

    expect(() => AvatarUploadSchema.parse(bad)).toThrow()
  })
})
