import { describe, expect, it } from "vitest"
import {
  allocatePhotoPositions,
  MAX_PHOTO_POSITIONS,
} from "../../../apps/web/lib/listings/photo-positions"

// SEC-006 (reconferência 2026-10-19) — Moradia calculava a posição como
// `existing.length + index`. Com posições [0,1,2], remover a 0 deixava [1,2] e a
// próxima foto caía em 2, colidindo. O banco agora recusa a colisão; a tela
// precisa escolher a primeira posição livre, inclusive buracos.

describe("SEC-006 posições livres da foto de Moradia", () => {
  it("preenche o buraco da esquerda em vez de repetir o tamanho da lista", () => {
    expect(allocatePhotoPositions([1, 2], 1)).toEqual([0])
  })

  it("usa as posições seguintes quando não há buraco", () => {
    expect(allocatePhotoPositions([0, 1, 2], 2)).toEqual([3, 4])
  })

  it("escolhe vários buracos em ordem crescente", () => {
    expect(allocatePhotoPositions([0, 2, 4], 3)).toEqual([1, 3, 5])
  })

  it("ignora posições inválidas, repetidas e fora do teto", () => {
    expect(allocatePhotoPositions([-1, 0, 0, 1.5, 12, 99], 2)).toEqual([1, 2])
  })

  it("não passa do teto de 12 posições", () => {
    const all = Array.from({ length: MAX_PHOTO_POSITIONS }, (_, index) => index)
    expect(allocatePhotoPositions(all, 1)).toEqual([])
    expect(allocatePhotoPositions([0, 2], 20)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })

  it("devolve lista vazia para pedido zero ou negativo", () => {
    expect(allocatePhotoPositions([], 0)).toEqual([])
    expect(allocatePhotoPositions([], -2)).toEqual([])
  })
})
