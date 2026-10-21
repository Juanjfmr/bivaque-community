// SEC-006 (reconferência 2026-10-19) — limpeza de EXIF no navegador.
//
// O reencode no canvas é a cortesia do aparelho: o servidor limpa de novo. Mas
// cada etapa pode rejeitar (`createImageBitmap`, canvas sem contexto 2d,
// `toBlob` nulo ou com exceção). Isolar a plataforma permite provar cada saída
// sem depender de um DOM real.

export interface DecodedImage {
  width: number
  height: number
  close(): void
}

export interface CanvasContextLike {
  drawImage(image: DecodedImage, dx: number, dy: number): void
}

export interface CanvasLike {
  width: number
  height: number
  getContext(type: "2d"): CanvasContextLike | null
}

export interface ClientImagePlatform {
  decode(file: File): Promise<DecodedImage>
  createCanvas(): CanvasLike
  encode(canvas: CanvasLike, type: string, quality: number): Promise<Blob | null>
}

export async function stripExifWith(file: File, platform: ClientImagePlatform): Promise<Blob> {
  const bitmap = await platform.decode(file)
  try {
    const canvas = platform.createCanvas()
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext("2d")
    if (context === null) throw new Error("canvas indisponível")
    context.drawImage(bitmap, 0, 0)
    const blob = await platform.encode(canvas, "image/jpeg", 0.9)
    if (blob === null) throw new Error("não foi possível processar a imagem")
    return blob
  } finally {
    bitmap.close()
  }
}

export function stripExif(file: File): Promise<Blob> {
  return stripExifWith(file, {
    decode: (input) => createImageBitmap(input),
    createCanvas: () => document.createElement("canvas"),
    encode: (canvas, type, quality) =>
      new Promise<Blob | null>((resolve) => {
        ;(canvas as HTMLCanvasElement).toBlob(resolve, type, quality)
      }),
  })
}
