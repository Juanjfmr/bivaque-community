// SEC-006 (reconferência 2026-10-19) — posições da foto de Moradia.
//
// `existing.length + index` tratava a quantidade de fotos como se as posições
// fossem sempre contíguas. Depois de remover a foto 0 de [0,1,2], a lista vira
// [1,2] e a próxima foto caía em 2 — colidindo com a existente. A alocação
// abaixo escolhe a primeira posição livre, inclusive buracos, e respeita o teto.

import { MAX_LISTING_PHOTOS } from "./types"

export const MAX_PHOTO_POSITIONS = MAX_LISTING_PHOTOS

export function allocatePhotoPositions(
  occupied: readonly number[],
  count: number,
  max: number = MAX_PHOTO_POSITIONS,
): number[] {
  const wanted = Math.max(0, Math.floor(count))
  if (wanted === 0) return []

  const limit = Math.max(0, Math.floor(max))
  const used = new Set<number>()
  for (const value of occupied) {
    if (Number.isInteger(value) && value >= 0 && value < limit) used.add(value)
  }

  const free: number[] = []
  for (let position = 0; position < limit && free.length < wanted; position += 1) {
    if (!used.has(position)) free.push(position)
  }
  return free
}
