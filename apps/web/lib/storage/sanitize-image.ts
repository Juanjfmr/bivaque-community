import "server-only"

import sharp from "sharp"

const MAX_INPUT_PIXELS = 25_000_000

const FORMATS = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
} as const

/** Server uploads only: decode pixels, apply EXIF orientation, then encode without metadata. */
export async function sanitizeImage(file: File, maxBytes: number): Promise<Buffer> {
  const format = FORMATS[file.type as keyof typeof FORMATS]
  if (!format || file.size === 0 || file.size > maxBytes) {
    throw new Error("Formato ou tamanho de imagem inválido.")
  }

  let output: Buffer
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), {
      animated: true,
      limitInputPixels: MAX_INPUT_PIXELS,
    })
    const metadata = await image.metadata()
    if (metadata.format !== format) throw new Error("MIME mismatch")
    // No keepMetadata/withMetadata: sharp discards EXIF, GPS, XMP and IPTC by default.
    // autoOrient applies rotations AND reflections before removing the orientation tag.
    // libvips cannot rotate multi-page images. Preserve their frames without
    // rotation, still discarding orientation and all other metadata.
    if ((metadata.pages ?? 1) === 1) image.autoOrient()
    output = await image.toFormat(format).toBuffer()
  } catch (error) {
    if (error instanceof Error && error.message.includes("pixel limit")) {
      throw new Error("A imagem deve ter no máximo 25 megapixels. Escolha uma imagem menor.")
    }
    throw new Error("Não foi possível ler a imagem. Envie uma imagem JPEG, PNG ou WebP válida.")
  }
  if (output.byteLength > maxBytes) {
    throw new Error("A imagem processada passa do tamanho permitido.")
  }
  return output
}
