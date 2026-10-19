import sharp from "sharp"
import { describe, expect, it } from "vitest"
import { sanitizeImage } from "web/lib/storage/sanitize-image"
import { locationImage } from "../../fixtures/location-image"

describe("SEC-004 image orientation pixels", () => {
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
