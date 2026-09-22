import { describe, expect, it } from "vitest"
import {
  formatMoney,
  headlinePrice,
  propertyCostLines,
  sumCosts,
  UNKNOWN_COST_LABEL,
} from "../../../apps/web/lib/listings/costs"

// RECON-027 — a regra D6 em teste: custo ausente é "Consultar anunciante" e
// nunca entra em soma. Prancha 19 exige exatamente isso.

describe("custo de Moradia", () => {
  it("formata valor cheio sem centavos e com centavos quando existem", () => {
    expect(formatMoney(220000)).toBe("R$ 2.200")
    expect(formatMoney(220050)).toBe("R$ 2.200,50")
  })

  it("preço em destaque de aluguel é por mês", () => {
    expect(headlinePrice("rent", { rentCents: 220000, salePriceCents: null })).toBe("R$ 2.200/mês")
  })

  it("preço em destaque de venda é valor único", () => {
    expect(headlinePrice("sale", { rentCents: null, salePriceCents: 45000000 })).toBe("R$ 450.000")
  })

  it("preço ausente é Consultar anunciante, nunca R$ 0", () => {
    expect(headlinePrice("rent", { rentCents: null, salePriceCents: null })).toBe(
      UNKNOWN_COST_LABEL,
    )
    expect(headlinePrice("sale", { rentCents: null, salePriceCents: null })).toBe(
      UNKNOWN_COST_LABEL,
    )
  })

  it("linha de custo não informado é marcada como desconhecida", () => {
    const lines = propertyCostLines({
      rentCents: 220000,
      condoFeeCents: null,
      iptuCents: 12000,
      salePriceCents: null,
    })
    expect(lines.map((line) => line.display)).toEqual(["R$ 2.200", UNKNOWN_COST_LABEL, "R$ 120"])
    expect(lines[1]?.unknown).toBe(true)
    expect(lines[0]?.unknown).toBe(false)
  })

  it("soma se recusa a tratar custo desconhecido como zero", () => {
    const incomplete = propertyCostLines({
      rentCents: 220000,
      condoFeeCents: null,
      iptuCents: 12000,
      salePriceCents: null,
    })
    expect(sumCosts(incomplete)).toBeNull()

    const complete = propertyCostLines({
      rentCents: 220000,
      condoFeeCents: 35000,
      iptuCents: 12000,
      salePriceCents: null,
    })
    expect(sumCosts(complete)).toBe(267000)
  })
})
