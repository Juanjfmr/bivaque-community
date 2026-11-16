import { describe, expect, it } from "vitest"
import {
  alertaDaLinha,
  alertaParaCorpo,
  alertCriteriaLabel,
  alertNameFromCriteria,
  alertSearchHref,
  alertSearchParams,
  alertStatusLabel,
  type ListingAlert,
  parseAlertCriteria,
} from "../../../apps/web/lib/listings/alerts"

// RECON-028 — prancha 65, painel 2, agora na porta do app (RUN-169): os
// critérios, a situação, o link de volta aos resultados e a validação que a
// rota `/api/app/imoveis/alertas` usa. Aluguel não inclui condomínio, então o
// rótulo do teto continua "Aluguel máximo".

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

  it("o nome derivado repete o que a busca antiga gravava", () => {
    expect(alertNameFromCriteria("rent", "Águas Claras")).toBe(
      "Moradia para alugar em Águas Claras",
    )
    expect(alertNameFromCriteria("sale", null)).toBe("Moradia")
  })
})

describe("link do alerta para a busca do app", () => {
  it("leva bairro, negócio, teto e quartos — as chaves que o Mercado filtra", () => {
    // RUN-171: bairro e tipo_negocio fecharam a perda declarada no RUN-169.
    expect(alertSearchParams(alert)).toEqual({
      bairro: "Águas Claras",
      tipo_negocio: "rent",
      valor_max: "2500",
      quartos: "2",
    })
    expect(alertSearchHref(alert)).toBe(
      "/app/imoveis?bairro=%C3%81guas+Claras&tipo_negocio=rent&valor_max=2500&quartos=2",
    )
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
    ).toBe("/app/imoveis")
  })

  it("teto com centavos não vira filtro arredondado", () => {
    expect(
      alertSearchParams({ ...alert, neighborhood: null, deal: null, maxValueCents: 250050 }),
    ).toEqual({ quartos: "2" })
  })
})

describe("validação compartilhada dos critérios", () => {
  const corpo = {
    nome: "Apartamento no Centro",
    bairro: "Centro",
    tipoNegocio: "rent",
    valorMaxCents: 250000,
    quartos: 2,
    ativo: true,
  }

  it("normaliza o corpo no critério que a tabela grava", () => {
    expect(parseAlertCriteria(corpo)).toEqual({
      ok: true,
      criterios: {
        name: "Apartamento no Centro",
        neighborhood: "Centro",
        deal: "rent",
        maxValueCents: 250000,
        minBedrooms: 2,
        isActive: true,
      },
    })
  })

  it("nome em branco deriva dos critérios, como a action antiga", () => {
    const lido = parseAlertCriteria({ ...corpo, nome: "   " })
    expect(lido).toMatchObject({
      ok: true,
      criterios: { name: "Moradia para alugar em Centro" },
    })
  })

  it("sem tipo de negócio o nome derivado não inventa aluguel", () => {
    expect(parseAlertCriteria({ bairro: "Centro" })).toMatchObject({
      ok: true,
      criterios: { name: "Moradia em Centro", deal: null },
    })
  })

  it.each([
    ["nome curto", { nome: "A" }, "nome"],
    ["nome longo", { nome: "x".repeat(81) }, "nome"],
    ["nome que não é texto", { nome: 42 }, "nome"],
    ["bairro longo", { bairro: "x".repeat(81) }, "bairro"],
    ["negócio fora do vocabulário", { tipoNegocio: "troca" }, "tipoNegocio"],
    ["valor negativo", { valorMaxCents: -1 }, "valorMaxCents"],
    ["valor acima do teto da tabela", { valorMaxCents: 100000001 }, "valorMaxCents"],
    ["valor quebrado", { valorMaxCents: 2500.5 }, "valorMaxCents"],
    ["quartos acima do limite", { quartos: 21 }, "quartos"],
    ["situação que não é booleana", { ativo: "sim" }, "ativo"],
  ])("recusa %s no campo declarado", (_rotulo, mudanca, campo) => {
    expect(parseAlertCriteria({ ...corpo, ...mudanca })).toEqual({ ok: false, campo })
  })

  it("quartos zero é 'qualquer número', como o parsePositiveInt da web", () => {
    expect(parseAlertCriteria({ ...corpo, quartos: 0 })).toMatchObject({
      ok: true,
      criterios: { minBedrooms: null },
    })
  })

  it("campos ausentes viram nulos, e a criação nasce ativa", () => {
    const lido = parseAlertCriteria({ nome: "Casa no Flores" })
    expect(lido).toEqual({
      ok: true,
      criterios: {
        name: "Casa no Flores",
        neighborhood: null,
        deal: null,
        maxValueCents: null,
        minBedrooms: null,
        isActive: true,
      },
    })
  })
})

describe("linha do banco e corpo da rota", () => {
  const linha = {
    id: alert.id,
    name: alert.name,
    kind: alert.kind,
    locality_id: alert.localityId,
    neighborhood: alert.neighborhood,
    deal: alert.deal,
    max_value_cents: alert.maxValueCents,
    min_bedrooms: alert.minBedrooms,
    is_active: alert.isActive,
    created_at: alert.createdAt,
  }

  it("traduz a linha da tabela sem perder coluna", () => {
    expect(alertaDaLinha(linha)).toEqual(alert)
  })

  it("o corpo do app leva os critérios e a busca que ele entende", () => {
    expect(alertaParaCorpo(alert)).toEqual({
      id: alert.id,
      nome: alert.name,
      bairro: "Águas Claras",
      tipoNegocio: "rent",
      valorMaxCents: 250000,
      quartos: 2,
      ativo: true,
      criadoEm: alert.createdAt,
      busca: { bairro: "Águas Claras", tipo_negocio: "rent", valor_max: "2500", quartos: "2" },
    })
  })
})
