import { describe, expect, it } from "vitest"
import {
  type PropertyDraftInput,
  parseOptionalArea,
  parseOptionalCents,
  parseOptionalInt,
  validatePropertyDraft,
} from "../../../apps/web/lib/listings/validation"

// RECON-027 — validação por tipo do anúncio de Moradia. Ausente é válido;
// incoerente (aluguel com preço de venda) é erro.

function draft(overrides: Partial<PropertyDraftInput> = {}): PropertyDraftInput {
  return {
    title: "Apartamento de 2 quartos",
    deal: "rent",
    propertyType: "apartment",
    rent: "2200",
    condoFee: "350",
    iptu: "",
    salePrice: "",
    bedrooms: "2",
    suites: "1",
    parkingSpots: "1",
    areaM2: "62",
    description: "Sala integrada à varanda.",
    neighborhood: "Águas Claras",
    availableFrom: "2026-10-01",
    ...overrides,
  }
}

describe("validação do anúncio de Moradia", () => {
  it("aceita rascunho completo de aluguel", () => {
    expect(validatePropertyDraft(draft())).toHaveProperty("ok", true)
  })

  it("aceita custo vazio como não informado", () => {
    expect(validatePropertyDraft(draft({ rent: "", condoFee: "", iptu: "" }))).toHaveProperty(
      "ok",
      true,
    )
  })

  it("recusa título fora de 2 a 120", () => {
    expect(validatePropertyDraft(draft({ title: "A" }))).not.toHaveProperty("ok", true)
    expect(validatePropertyDraft(draft({ title: "x".repeat(121) }))).not.toHaveProperty("ok", true)
  })

  it("recusa negócio ou tipo de imóvel fora da lista", () => {
    expect(validatePropertyDraft(draft({ deal: "troca" }))).not.toHaveProperty("ok", true)
    expect(validatePropertyDraft(draft({ propertyType: "castelo" }))).not.toHaveProperty("ok", true)
  })

  it("recusa aluguel com preço de venda e venda com aluguel", () => {
    expect(validatePropertyDraft(draft({ deal: "rent", salePrice: "450000" }))).not.toHaveProperty(
      "ok",
      true,
    )
    expect(
      validatePropertyDraft(draft({ deal: "sale", rent: "2200", salePrice: "450000" })),
    ).not.toHaveProperty("ok", true)
  })

  it("aceita venda com preço e sem aluguel", () => {
    expect(
      validatePropertyDraft(draft({ deal: "sale", rent: "", salePrice: "450000" })),
    ).toHaveProperty("ok", true)
  })

  it("recusa custo fracionado ou negativo", () => {
    expect(validatePropertyDraft(draft({ rent: "22,50" }))).not.toHaveProperty("ok", true)
    expect(validatePropertyDraft(draft({ condoFee: "-5" }))).not.toHaveProperty("ok", true)
  })

  it("aceita área com vírgula e recusa texto", () => {
    expect(validatePropertyDraft(draft({ areaM2: "62,5" }))).toHaveProperty("ok", true)
    expect(validatePropertyDraft(draft({ areaM2: "sessenta" }))).not.toHaveProperty("ok", true)
  })

  it("converte opcionais vazios em null", () => {
    expect(parseOptionalCents("")).toBeNull()
    expect(parseOptionalCents("2200")).toBe(220000)
    expect(parseOptionalInt("")).toBeNull()
    expect(parseOptionalInt("2")).toBe(2)
    expect(parseOptionalArea("")).toBeNull()
    expect(parseOptionalArea("62,5")).toBe(62.5)
  })
})
