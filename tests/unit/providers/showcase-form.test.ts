import { describe, expect, it } from "vitest"
import {
  validateBio,
  validateCategory,
  validateContactPhone,
  validateDescription,
  validateDisplayName,
  validatePriceCents,
  validateTitle,
} from "../../../apps/web/lib/providers/showcase"

// Onda G Task 4, Step 2 — os limites da borda, exatamente como os `check`s
// da migration da ficha (20260825185327). O servidor valida ANTES de tocar o
// banco; estes testes são a prova dos limites sem precisar do banco.

describe("validação da borda da vitrine", () => {
  it("display_name exige entre 2 e 80 caracteres", () => {
    expect(validateDisplayName("A")).not.toHaveProperty("ok", true)
    expect(validateDisplayName("  ")).not.toHaveProperty("ok", true)
    expect(validateDisplayName("João Eletricista")).toHaveProperty("ok", true)
    expect(validateDisplayName("x".repeat(81))).not.toHaveProperty("ok", true)
    expect(validateDisplayName("x".repeat(80))).toHaveProperty("ok", true)
  })

  it("categoria aceita somente a lista fechada", () => {
    expect(validateCategory("alimentacao")).toHaveProperty("ok", true)
    expect(validateCategory("outros")).not.toHaveProperty("ok", true)
    expect(validateCategory("")).not.toHaveProperty("ok", true)
  })

  it("bio aceita vazio e teto de 800", () => {
    expect(validateBio(null)).toHaveProperty("ok", true)
    expect(validateBio("   ")).toHaveProperty("ok", true)
    expect(validateBio("x".repeat(800))).toHaveProperty("ok", true)
    expect(validateBio("x".repeat(801))).not.toHaveProperty("ok", true)
  })

  it("telefone aceita 10-15 dígitos com + opcional e recusa o resto", () => {
    expect(validateContactPhone(null)).toHaveProperty("ok", true)
    expect(validateContactPhone("")).toHaveProperty("ok", true)
    expect(validateContactPhone("9299999999")).toHaveProperty("ok", true)
    expect(validateContactPhone("+5592999999999")).toHaveProperty("ok", true)
    expect(validateContactPhone("92 99999-9999")).not.toHaveProperty("ok", true)
    expect(validateContactPhone("999")).not.toHaveProperty("ok", true)
  })

  it("título de item exige entre 2 e 120 caracteres", () => {
    expect(validateTitle("L")).not.toHaveProperty("ok", true)
    expect(validateTitle("Limpeza completa")).toHaveProperty("ok", true)
    expect(validateTitle("x".repeat(121))).not.toHaveProperty("ok", true)
  })

  it("descrição de item aceita vazio e teto de 600", () => {
    expect(validateDescription(null)).toHaveProperty("ok", true)
    expect(validateDescription("x".repeat(600))).toHaveProperty("ok", true)
    expect(validateDescription("x".repeat(601))).not.toHaveProperty("ok", true)
  })

  it("preço aceita inteiro não negativo dentro do teto e recusa o resto", () => {
    expect(validatePriceCents(null)).toHaveProperty("ok", true)
    expect(validatePriceCents("")).toHaveProperty("ok", true)
    expect(validatePriceCents("0")).toHaveProperty("ok", true)
    expect(validatePriceCents("18000")).toHaveProperty("ok", true)
    expect(validatePriceCents("-1")).not.toHaveProperty("ok", true)
    expect(validatePriceCents("18.50")).not.toHaveProperty("ok", true)
    expect(validatePriceCents("100000001")).not.toHaveProperty("ok", true)
  })
})
