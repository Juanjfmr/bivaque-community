// FIGMA-002 — prova unitária dos rótulos de custo/specs das pranchas
// property-* com a regra D6: ausente é "Consultar anunciante", nunca R$ 0,00;
// o total soma somente custos presentes.

import { LISTING_COST_UNINFORMED_LABEL } from "@bivaque/domain"
import { describe, expect, it } from "vitest"
import {
  condoFooterLabel,
  costLinesFor,
  formatBrl,
  propertyTypeLabel,
  specsLabel,
} from "web/lib/listings/format"
import type { PropertyDetailRow } from "web/lib/listings/types"

function details(overrides: Partial<PropertyDetailRow> = {}): PropertyDetailRow {
  return {
    listing_id: "30000000-0000-4000-8000-000000000001",
    property_type: "apartamento",
    neighborhood: "Ponta Negra",
    rent_cents: 320000,
    condo_fee_cents: 72000,
    iptu_cents: null,
    bedrooms: 3,
    bathrooms: 2,
    parking_spots: 2,
    area_m2: 98,
    available_from: null,
    is_furnished: true,
    accepts_pets: false,
    condo_included_in_rent: false,
    ...overrides,
  }
}

describe("custos da prancha 19 com D6", () => {
  it("formata reais sem casa decimal quando inteiro", () => {
    expect(formatBrl(320000)).toBe("R$\u00A03.200")
    expect(formatBrl(72000)).toBe("R$\u00A0720")
    expect(formatBrl(392050)).toBe("R$\u00A03.920,50")
  })

  it("o rodapé do card distingue ausente, zero e presente", () => {
    expect(condoFooterLabel(72000)).toBe("+R$\u00A0720 condomínio")
    expect(condoFooterLabel(0)).toBe("Sem condomínio")
    expect(condoFooterLabel(null)).toBe(LISTING_COST_UNINFORMED_LABEL)
  })

  it("painel de custos: IPTU ausente não vira zero e some do total", () => {
    const lines = costLinesFor(details())
    expect(lines.rent).toBe("R$\u00A03.200")
    expect(lines.condo).toBe("R$\u00A0720")
    expect(lines.iptu).toBe(LISTING_COST_UNINFORMED_LABEL)
    expect(lines.total).toBe("R$\u00A03.920")
  })

  it("sem aluguel informado não há total nem R$ 0,00 em lugar nenhum", () => {
    const lines = costLinesFor(details({ rent_cents: null, condo_fee_cents: null }))
    expect(lines.rent).toBe(LISTING_COST_UNINFORMED_LABEL)
    expect(lines.condo).toBe(LISTING_COST_UNINFORMED_LABEL)
    expect(lines.total).toBeNull()
    expect(JSON.stringify(lines)).not.toContain("R$\u00A00")
  })

  it("specs só listam o que existe", () => {
    expect(specsLabel(details())).toBe("3 quartos · 98 m² · 2 vagas")
    expect(specsLabel(details({ parking_spots: null, area_m2: null }))).toBe("3 quartos")
    expect(specsLabel(details({ bedrooms: null, area_m2: null, parking_spots: null }))).toBe("")
  })

  it("condomínio incluso não é somado uma segunda vez", () => {
    expect(costLinesFor(details({ condo_included_in_rent: true })).total).toBe("R$\u00A03.200")
  })

  it("rótulos de tipo vêm do domínio, não da tela", () => {
    expect(propertyTypeLabel("apartamento")).toBe("Apartamento")
    expect(propertyTypeLabel("kitnet")).toBe("Kitnet")
  })
})
