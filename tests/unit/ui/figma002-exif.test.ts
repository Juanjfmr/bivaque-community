// FIGMA-002 — prova unitária da remoção de EXIF na entrada (ADR de mídia D5)
// e da regra D6 de custos anuláveis. Bytes sintéticos: o que se prova é o
// reescritor puro de packages/domain, nos três formatos da allowlist.

import {
  hasImageExif,
  informedTotalCents,
  LISTING_COST_UNINFORMED_LABEL,
  stripImageExif,
} from "@bivaque/domain"
import { describe, expect, it } from "vitest"

function bytes(...values: number[]): Uint8Array {
  return Uint8Array.from(values)
}

function jpegWithExif(): Uint8Array {
  const exifPayload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0xde, 0xad, 0xbe, 0xef]
  const app1 = [0xff, 0xe1, 0x00, exifPayload.length + 2, ...exifPayload]
  const app0 = [0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46]
  const sos = [0xff, 0xda, 0x00, 0x02]
  const entropy = [0xaa, 0xbb, 0xcc, 0xff, 0xd9]
  return bytes(0xff, 0xd8, ...app1, ...app0, ...sos, ...entropy)
}

function pngWithExif(): Uint8Array {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  const exifData = [0x4d, 0x4d, 0x00, 0x2a]
  const exifChunk = [
    0x00,
    0x00,
    0x00,
    exifData.length,
    0x65,
    0x58,
    0x49,
    0x66,
    ...exifData,
    0,
    0,
    0,
    0,
  ]
  const idatData = [0x78, 0x9c, 0x01]
  const idatChunk = [
    0x00,
    0x00,
    0x00,
    idatData.length,
    0x49,
    0x44,
    0x41,
    0x54,
    ...idatData,
    0,
    0,
    0,
    0,
  ]
  return bytes(...signature, ...exifChunk, ...idatChunk)
}

function webpWithExif(): Uint8Array {
  const exifData = [0x4d, 0x4d, 0x00, 0x2a]
  const exifChunk = [0x45, 0x58, 0x49, 0x46, exifData.length, 0, 0, 0, ...exifData]
  const vp8Data = [0x9d, 0x01, 0x2a]
  // WebP paddea cada chunk para tamanho par: o byte extra faz parte do arquivo.
  const vp8Chunk = [0x56, 0x50, 0x38, 0x20, vp8Data.length, 0, 0, 0, ...vp8Data, 0x00]
  const body = 4 + exifChunk.length + vp8Chunk.length
  return bytes(
    0x52,
    0x49,
    0x46,
    0x46,
    body & 0xff,
    (body >> 8) & 0xff,
    (body >> 16) & 0xff,
    (body >> 24) & 0xff,
    0x57,
    0x45,
    0x42,
    0x50,
    ...exifChunk,
    ...vp8Chunk,
  )
}

describe("stripImageExif", () => {
  it("JPEG: remove o segmento APP1 e preserva o resto do arquivo", () => {
    const original = jpegWithExif()
    expect(hasImageExif(original)).toBe(true)
    const stripped = stripImageExif(original)
    expect(hasImageExif(stripped)).toBe(false)
    // SOI preservado e o APP0 (JFIF) sobrevive: só o metadado sai.
    expect(Array.from(stripped.slice(0, 2))).toEqual([0xff, 0xd8])
    expect(Array.from(stripped)).toContain(0x4a) // "J" de JFIF no APP0
    expect(stripped.length).toBeLessThan(original.length)
    // Idempotente: reprocessar não muda nada.
    expect(Array.from(stripImageExif(stripped))).toEqual(Array.from(stripped))
  })

  it("PNG: remove o chunk eXIf e preserva o IDAT", () => {
    const original = pngWithExif()
    expect(hasImageExif(original)).toBe(true)
    const stripped = stripImageExif(original)
    expect(hasImageExif(stripped)).toBe(false)
    const asText = String.fromCharCode(...stripped)
    expect(asText).toContain("IDAT")
    expect(asText).not.toContain("eXIf")
    // A assinatura PNG continua íntegra.
    expect(Array.from(stripped.slice(0, 8))).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ])
  })

  it("WebP: remove EXIF/XMP e recalcula o tamanho RIFF", () => {
    const original = webpWithExif()
    expect(hasImageExif(original)).toBe(true)
    const stripped = stripImageExif(original)
    expect(hasImageExif(stripped)).toBe(false)
    const declared = stripped[4] | (stripped[5] << 8) | (stripped[6] << 16) | (stripped[7] << 24)
    expect(declared).toBe(stripped.length - 8)
    expect(Array.from(stripped)).toContain(0x9d) // payload VP8 preservado
  })

  it("formato desconhecido volta como estava (allowlist de MIME é de quem chama)", () => {
    const pdf = bytes(0x25, 0x50, 0x44, 0x46)
    expect(Array.from(stripImageExif(pdf))).toEqual(Array.from(pdf))
    expect(hasImageExif(pdf)).toBe(false)
  })

  it("WebP grande (chunk de 512 KiB) não estoura a call stack e preserva a imagem", () => {
    // Revisão independente 06/10/2026: o reescritor antigo usava spread de
    // array e morria com RangeError em chunk deste tamanho.
    const vp8Data = new Uint8Array(512 * 1024)
    for (let i = 0; i < vp8Data.length; i += 1) vp8Data[i] = i % 251
    const exifChunk = [0x45, 0x58, 0x49, 0x46, 4, 0, 0, 0, 0x4d, 0x4d, 0x00, 0x2a]
    const vp8Size = vp8Data.length
    const vp8ChunkHeader = [
      0x56,
      0x50,
      0x38,
      0x20,
      vp8Size & 0xff,
      (vp8Size >> 8) & 0xff,
      (vp8Size >> 16) & 0xff,
      (vp8Size >> 24) & 0xff,
    ]
    const body = 4 + exifChunk.length + 8 + vp8Size
    const header = [
      0x52,
      0x49,
      0x46,
      0x46,
      body & 0xff,
      (body >> 8) & 0xff,
      (body >> 16) & 0xff,
      (body >> 24) & 0xff,
      0x57,
      0x45,
      0x42,
      0x50,
    ]
    const original = new Uint8Array(header.length + exifChunk.length + 8 + vp8Size)
    original.set(header, 0)
    original.set(exifChunk, header.length)
    original.set(vp8ChunkHeader, header.length + exifChunk.length)
    original.set(vp8Data, header.length + exifChunk.length + 8)

    expect(hasImageExif(original)).toBe(true)
    const stripped = stripImageExif(original)
    expect(hasImageExif(stripped)).toBe(false)
    // 12 bytes de header + chunk VP8 intacto (8 + 524288) = 524308.
    expect(stripped.byteLength).toBe(524308)
    // O payload de imagem sobrevive byte a byte no lugar certo.
    expect(stripped.subarray(20, 26)).toEqual(vp8Data.subarray(0, 6))
    const declared = stripped[4] | (stripped[5] << 8) | (stripped[6] << 16) | (stripped[7] << 24)
    expect(declared).toBe(stripped.byteLength - 8)
  })
})

describe("custos de moradia (D6)", () => {
  it("sem aluguel informado não existe total", () => {
    expect(informedTotalCents(null, 72000, null)).toBeNull()
    expect(LISTING_COST_UNINFORMED_LABEL).toBe("Consultar anunciante")
  })

  it("o total soma somente custos presentes — nunca zero no lugar de null", () => {
    expect(informedTotalCents(320000, 72000, null)).toBe(392000)
    expect(informedTotalCents(320000, null, null)).toBe(320000)
    expect(informedTotalCents(320000, 72000, 12000)).toBe(404000)
  })
})
