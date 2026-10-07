// FIGMA-002 — remoção de EXIF na entrada, sem dependência externa.
// ADR-20260909-midia-de-membro D5: metadado de câmera carrega coordenada
// geográfica, e a §4.7 proíbe expor endereço residencial. O arquivo é
// reescrito SEM os segmentos de metadado antes de chegar ao bucket — a prova
// é de bytes (o objeto guardado não contém o marcador Exif/eXIf/EXIF).
//
// Função pura sobre bytes: testável em node sem DOM, mesmo padrão dos outros
// módulos deste pacote (pii-scrub). A reescrita é em dois passos (mede os
// trechos mantidos, depois copia por subarray): NUNCA spread de array grande,
// que estoura a call stack em chunk de centenas de KiB (achado da revisão
// independente de 06/10/2026 com arquivo de 524308 bytes).

const JPEG_SOI = 0xffd8
const APP1 = 0xffe1

type Range = { start: number; end: number }

function u16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset)
}

function u32(bytes: Uint8Array, offset: number, littleEndian = false): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    offset,
    littleEndian,
  )
}

function fourcc(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + 4))
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && u16(bytes, 0) === JPEG_SOI
}

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
}

function isWebp(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && fourcc(bytes, 0) === "RIFF" && fourcc(bytes, 8) === "WEBP"
}

function concatRanges(bytes: Uint8Array, ranges: Range[], prefix?: Uint8Array): Uint8Array {
  const prefixLength = prefix?.length ?? 0
  const total = prefixLength + ranges.reduce((sum, range) => sum + (range.end - range.start), 0)
  const out = new Uint8Array(total)
  let offset = 0
  if (prefix) {
    out.set(prefix, 0)
    offset = prefixLength
  }
  for (const range of ranges) {
    out.set(bytes.subarray(range.start, range.end), offset)
    offset += range.end - range.start
  }
  return out
}

/** JPEG: reconstrói o arquivo sem os segmentos APP1 (Exif/XMP). */
function stripJpeg(bytes: Uint8Array): Uint8Array {
  const ranges: Range[] = [{ start: 0, end: 2 }]
  let offset = 2
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) break
    const marker = u16(bytes, offset)
    // Marcadores sem payload (RST, SOI, EOI): copia e avança 2 bytes.
    if (marker === 0xffd8 || marker === 0xffd9 || (marker >= 0xffd0 && marker <= 0xffd7)) {
      ranges.push({ start: offset, end: offset + 2 })
      offset += 2
      continue
    }
    const size = u16(bytes, offset + 2)
    if (size < 2 || offset + 2 + size > bytes.length) break
    if (marker !== APP1) {
      ranges.push({ start: offset, end: offset + 2 + size })
    }
    offset += 2 + size
    // Depois do SOS o resto é entropy-coded: copia tudo e termina.
    if (marker === 0xffda) {
      ranges.push({ start: offset, end: bytes.length })
      break
    }
  }
  return concatRanges(bytes, ranges)
}

/** PNG: reconstrói sem chunks eXIf. */
function stripPng(bytes: Uint8Array): Uint8Array {
  const ranges: Range[] = [{ start: 0, end: 8 }]
  let offset = 8
  while (offset + 12 <= bytes.length) {
    const length = u32(bytes, offset)
    const type = fourcc(bytes, offset + 4)
    const total = 12 + length
    if (offset + total > bytes.length) break
    if (type !== "eXIf") {
      ranges.push({ start: offset, end: offset + total })
    }
    offset += total
  }
  return concatRanges(bytes, ranges)
}

/** WebP: reconstrói sem os chunks EXIF e XMP, recalculando o tamanho RIFF. */
function stripWebp(bytes: Uint8Array): Uint8Array {
  const ranges: Range[] = []
  let offset = 12
  while (offset + 8 <= bytes.length) {
    const chunkType = fourcc(bytes, offset)
    const size = u32(bytes, offset + 4, true)
    const padded = size + (size % 2)
    if (offset + 8 + padded > bytes.length) break
    if (chunkType !== "EXIF" && chunkType !== "XMP ") {
      ranges.push({ start: offset, end: offset + 8 + padded })
    }
    offset += 8 + padded
  }
  const bodyLength = 4 + ranges.reduce((sum, range) => sum + (range.end - range.start), 0)
  const prefix = Uint8Array.from([
    bytes[0],
    bytes[1],
    bytes[2],
    bytes[3],
    bodyLength & 0xff,
    (bodyLength >> 8) & 0xff,
    (bodyLength >> 16) & 0xff,
    (bodyLength >> 24) & 0xff,
    bytes[8],
    bytes[9],
    bytes[10],
    bytes[11],
  ])
  return concatRanges(bytes, ranges, prefix)
}

/**
 * Reescreve a imagem sem metadado de câmera/localização. Formato desconhecido
 * volta como estava — a validação de MIME/magic é responsabilidade de quem
 * chama (bucket e server action têm allowlist própria).
 */
export function stripImageExif(bytes: Uint8Array): Uint8Array {
  if (isJpeg(bytes)) return stripJpeg(bytes)
  if (isPng(bytes)) return stripPng(bytes)
  if (isWebp(bytes)) return stripWebp(bytes)
  return bytes
}

/** Verdadeiro quando ainda existe marcador de metadado removível nos bytes. */
export function hasImageExif(bytes: Uint8Array): boolean {
  if (isJpeg(bytes)) {
    let offset = 2
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) break
      const marker = u16(bytes, offset)
      if (marker === 0xffda) break
      if (marker === APP1) return true
      const size = u16(bytes, offset + 2)
      if (size < 2) break
      offset += 2 + size
    }
    return false
  }
  if (isPng(bytes)) {
    let offset = 8
    while (offset + 12 <= bytes.length) {
      const length = u32(bytes, offset)
      const type = fourcc(bytes, offset + 4)
      if (type === "eXIf") return true
      offset += 12 + length
    }
    return false
  }
  if (isWebp(bytes)) {
    let offset = 12
    while (offset + 8 <= bytes.length) {
      const chunkType = fourcc(bytes, offset)
      const size = u32(bytes, offset + 4, true)
      if (chunkType === "EXIF" || chunkType === "XMP ") return true
      offset += 8 + size + (size % 2)
    }
    return false
  }
  return false
}
