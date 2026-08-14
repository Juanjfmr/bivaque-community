import {
  RecommendationCategorySchema,
  RecommendationRejectPaidSchema,
  RecommendationRejectProviderSchema,
  RecommendationRejectSponsoredSchema,
  RecommendationRequestInsertSchema,
} from "@bivaque/contracts"
import { describe, expect, it } from "vitest"

describe("recommendation provider profile prohibition", () => {
  it("rejects a recommendation request with is_provider flag", () => {
    expect(() =>
      RecommendationRejectProviderSchema.parse({
        isProvider: true,
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toThrow()
  })

  it("rejects a recommendation request with provider_bio", () => {
    expect(() =>
      RecommendationRejectProviderSchema.parse({
        providerBio: "Sou um profissional com 20 anos de experiencia.",
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toThrow()
  })

  it("rejects a recommendation request with provider_rating", () => {
    expect(() =>
      RecommendationRejectProviderSchema.parse({
        providerRating: 5,
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toThrow()
  })

  it("accepts a normal recommendation without provider fields", () => {
    expect(
      RecommendationRejectProviderSchema.parse({
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toEqual({
      title: "Titulo valido",
      body: "Descricao valida com mais de 10 caracteres para passar.",
      category: "outros",
    })
  })
})

describe("recommendation payment field prohibition", () => {
  it("rejects a recommendation request with price field", () => {
    expect(() =>
      RecommendationRejectPaidSchema.parse({
        price: 150.0,
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toThrow()
  })

  it("rejects a recommendation request with payment_method field", () => {
    expect(() =>
      RecommendationRejectPaidSchema.parse({
        paymentMethod: "pix",
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toThrow()
  })

  it("rejects a recommendation request with is_paid field", () => {
    expect(() =>
      RecommendationRejectPaidSchema.parse({
        isPaid: true,
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toThrow()
  })

  it("accepts a normal recommendation without payment fields", () => {
    expect(
      RecommendationRejectPaidSchema.parse({
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toEqual({
      title: "Titulo valido",
      body: "Descricao valida com mais de 10 caracteres para passar.",
      category: "outros",
    })
  })
})

describe("recommendation sponsorship prohibition", () => {
  it("rejects a recommendation request with is_sponsored flag", () => {
    expect(() =>
      RecommendationRejectSponsoredSchema.parse({
        isSponsored: true,
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toThrow()
  })

  it("rejects a recommendation request with promoted flag", () => {
    expect(() =>
      RecommendationRejectSponsoredSchema.parse({
        isPromoted: true,
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toThrow()
  })

  it("rejects a recommendation request with ad_rank", () => {
    expect(() =>
      RecommendationRejectSponsoredSchema.parse({
        adRank: 1,
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toThrow()
  })

  it("accepts a normal recommendation without sponsorship fields", () => {
    expect(
      RecommendationRejectSponsoredSchema.parse({
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toEqual({
      title: "Titulo valido",
      body: "Descricao valida com mais de 10 caracteres para passar.",
      category: "outros",
    })
  })
})

describe("recommendation category validation", () => {
  it("accepts a known category", () => {
    expect(RecommendationCategorySchema.parse("saude_bem_estar")).toBe("saude_bem_estar")
  })

  it("rejects an unknown category", () => {
    expect(() => RecommendationCategorySchema.parse("categoria_inventada")).toThrow()
  })

  it("rejects a commercial category name", () => {
    expect(() => RecommendationCategorySchema.parse("compras")).toThrow()
    expect(() => RecommendationCategorySchema.parse("marketplace")).toThrow()
    expect(() => RecommendationCategorySchema.parse("vendas")).toThrow()
  })
})

describe("recommendation request insert origin scope", () => {
  it("accepts a request with localityId only", () => {
    expect(
      RecommendationRequestInsertSchema.parse({
        localityId: "00000000-0000-4000-8000-000000000001",
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toMatchObject({ localityId: "00000000-0000-4000-8000-000000000001" })
  })

  it("accepts a request with groupId only", () => {
    expect(
      RecommendationRequestInsertSchema.parse({
        groupId: "80000000-0000-4000-8000-000000000001",
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toMatchObject({ groupId: "80000000-0000-4000-8000-000000000001" })
  })

  it("rejects a request with both localityId and groupId", () => {
    expect(() =>
      RecommendationRequestInsertSchema.parse({
        localityId: "00000000-0000-4000-8000-000000000001",
        groupId: "80000000-0000-4000-8000-000000000001",
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toThrow()
  })

  it("rejects a request with neither localityId nor groupId", () => {
    expect(() =>
      RecommendationRequestInsertSchema.parse({
        title: "Titulo valido",
        body: "Descricao valida com mais de 10 caracteres para passar.",
        category: "outros",
      }),
    ).toThrow()
  })
})
