import sharp from "sharp"
import { describe, expect, it, vi } from "vitest"
import { sanitizeImage } from "web/lib/storage/sanitize-image"
import {
  animatedLocationImage,
  locationImage,
  oversizedPixelImage,
} from "../../fixtures/location-image"

vi.mock("server-only", () => ({}))

describe("SEC-004 image orientation pixels", () => {
  it("accepts animated WebP with EXIF orientation 6 without rotating multiple pages", async () => {
    const file = await animatedLocationImage()
    const before = await sharp(Buffer.from(await file.arrayBuffer()), { animated: true }).metadata()
    expect(before.pages).toBe(2)
    expect(before.orientation).toBe(6)
    const bytes = await sanitizeImage(file, 1024 * 1024)
    const image = sharp(bytes, { animated: true })
    const after = await image.metadata()
    expect(after.pages).toBe(2)
    expect(after.delay).toEqual(before.delay)
    expect(after.pageHeight).toBe(before.pageHeight)
    expect(after.width).toBe(before.width)
    expect(after.exif).toBeUndefined()
    expect(after.orientation).toBeUndefined()
    const originalPixels = await sharp(Buffer.from(await file.arrayBuffer()), { animated: true })
      .raw()
      .toBuffer()
    // WebP reencoding is lossy; frame order/colors must survive, not exact bytes.
    const outputPixels = await image.raw().toBuffer()
    expect(outputPixels.length).toBe(originalPixels.length)
    for (const [index, value] of outputPixels.entries()) {
      expect(Math.abs(value - (originalPixels[index] ?? 0))).toBeLessThanOrEqual(5)
    }
  })

  it("rejects a valid 16000 x 16000 PNG with a clear 25 megapixel limit", async () => {
    const file = oversizedPixelImage()
    expect(file.size).toBeLessThan(1024 * 1024)
    await expect(sanitizeImage(file, 1024 * 1024)).rejects.toThrow("25 megapixels")
  })
  const orientations = [
    [1, [1, 2, 3, 4, 5, 6]],
    [2, [2, 1, 4, 3, 6, 5]],
    [3, [6, 5, 4, 3, 2, 1]],
    [4, [5, 6, 3, 4, 1, 2]],
    [5, [1, 3, 5, 2, 4, 6]],
    [6, [5, 3, 1, 6, 4, 2]],
    [7, [6, 4, 2, 5, 3, 1]],
    [8, [2, 4, 6, 1, 3, 5]],
  ] as const

  it.each(orientations)(
    "applies EXIF orientation %s before stripping it",
    async (orientation, expected) => {
      const bytes = await sharp(Buffer.from([1, 2, 3, 4, 5, 6].flatMap((v) => [v * 20, 0, 0])), {
        raw: { width: 2, height: 3, channels: 3 },
      })
        .withMetadata({ orientation })
        .png()
        .toBuffer()
      const file = new File([new Uint8Array(bytes)], "oriented.png", { type: "image/png" })
      const output = await sanitizeImage(file, 1024 * 1024)
      const pixels = await sharp(output).removeAlpha().raw().toBuffer()
      expect([...pixels].filter((_, index) => index % 3 === 0)).toEqual(expected.map((v) => v * 20))
      expect((await sharp(output).metadata()).orientation).toBeUndefined()
    },
  )

  it("rejects a decoded format that disagrees with the MIME", async () => {
    const png = await locationImage("png")
    const forged = new File([await png.arrayBuffer()], "forged.jpg", { type: "image/jpeg" })
    await expect(sanitizeImage(forged, 1024 * 1024)).rejects.toThrow("Não foi possível ler")
  })

  it("enforces the byte limit again after reencoding", async () => {
    const pixels = Uint8Array.from({ length: 100 * 100 * 3 }, (_, i) => (i * 73 + i * i) % 256)
    const bytes = await sharp(pixels, { raw: { width: 100, height: 100, channels: 3 } })
      .jpeg({ quality: 1 })
      .toBuffer()
    const file = new File([new Uint8Array(bytes)], "small.jpg", { type: "image/jpeg" })
    const output = await sanitizeImage(file, 1024 * 1024)
    expect(output.byteLength).toBeGreaterThan(file.size)
    await expect(sanitizeImage(file, file.size)).rejects.toThrow("tamanho permitido")
  })
})
