import { describe, expect, it } from "vitest"
import {
  alertCriteriaLabel,
  alertSearchHref,
  alertStatusLabel,
  type ListingAlert,
} from "../../../apps/web/lib/listings/alerts"

// RECON-028 — prancha 65, painel 2: os critérios, a situação e o link de volta
// aos resultados. Aluguel não inclui condomínio, então o rótulo do teto continua
// "Aluguel máximo".

const alert: ListingAlert = {
  id: "c0000000-0000-4000-8000-000000000001",
  name: "Apartamentos em Águas Claras",
  kind: "property",
  localityId: "00000000-0000-4000-8000-000000000001",
  neighborhood: "Águas Claras",
  deal: "rent",
  maxValueCents: 250000,
  minBedrooms: 2,
  isActive: true,
  createdAt: "2024-05-20T12:00:00.000Z",
}

describe("alerta de Moradia — apresentação", () => {
  it("junta os critérios do cartão com ponto médio", () => {
    expect(alertCriteriaLabel(alert)).toBe("Aluguel · Até R$ 2.500 · 2+ quartos")
  })

  it("rotula venda sem falar de aluguel", () => {
    expect(alertCriteriaLabel({ ...alert, deal: "sale" })).toBe("Venda · Até R$ 2.500 · 2+ quartos")
  })

  it("sem critério nenhum diz que cobre todos os imóveis", () => {
    expect(
      alertCriteriaLabel({
        ...alert,
        deal: null,
        maxValueCents: null,
        minBedrooms: null,
      }),
    ).toBe("Todos os imóveis")
  })

  it("mostra situação e data de criação", () => {
    expect(alertStatusLabel(alert)).toBe("Ativo · Criado em 20/05/2024")
    expect(alertStatusLabel({ ...alert, isActive: false })).toBe("Inativo · Criado em 20/05/2024")
  })

  it("abre os resultados com os critérios normalizados", () => {
    const href = alertSearchHref(alert)
    expect(href.startsWith("/imoveis?")).toBe(true)
    expect(href).toContain("bairro=%C3%81guas+Claras")
    expect(href).toContain("tipo_negocio=rent")
    expect(href).toContain("valor_max=2500")
    expect(href).toContain("quartos=2")
  })

  it("sem critério, o link leva à busca limpa", () => {
    expect(
      alertSearchHref({
        ...alert,
        neighborhood: null,
        deal: null,
        maxValueCents: null,
        minBedrooms: null,
      }),
    ).toBe("/imoveis")
  })
})
