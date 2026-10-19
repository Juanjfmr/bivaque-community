import sharp from "sharp"

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
    const image = sharp(Buffer.from(await file.arrayBuffer()), { animated: true })
    const metadata = await image.metadata()
    if (metadata.format !== format) throw new Error("MIME mismatch")
    // No keepMetadata/withMetadata: sharp discards EXIF, GPS, XMP and IPTC by default.
    // autoOrient applies rotations AND reflections before removing the orientation tag.
    output = await image.autoOrient().toFormat(format).toBuffer()
  } catch {
    throw new Error("Não foi possível ler a imagem. Envie uma imagem JPEG, PNG ou WebP válida.")
  }
  if (output.byteLength > maxBytes) {
    throw new Error("A imagem processada passa do tamanho permitido.")
  }
  return output
}
