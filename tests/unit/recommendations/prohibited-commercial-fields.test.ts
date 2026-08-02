import {
  RecommendationBodySchema,
  RecommendationCategorySchema,
  RecommendationRejectPaidSchema,
  RecommendationRejectProviderSchema,
  RecommendationRejectSponsoredSchema,
  RecommendationRequestInsertSchema,
  RecommendationTitleSchema,
} from "@bivaque/contracts"
import { describe, expect, it } from "vitest"

describe("recommendation commercial field prohibition", () => {
  it("rejects a title containing the word 'promocao'", () => {
    expect(() => RecommendationTitleSchema.parse("Promocao imperdivel de produtos!")).toThrow()
  })

  it("rejects a title containing the word 'anuncio'", () => {
    expect(() => RecommendationTitleSchema.parse("Melhor anuncio da cidade")).toThrow()
  })

  it("rejects a title containing the word 'pagamento'", () => {
    expect(() => RecommendationTitleSchema.parse("Pagamento facilitado em ate 12x")).toThrow()
  })

  it("rejects a title containing the word 'preco'", () => {
    expect(() => RecommendationTitleSchema.parse("Menor preco garantido da regiao")).toThrow()
  })

  it("rejects a title containing the word 'patrocinio'", () => {
    expect(() => RecommendationTitleSchema.parse("Conteudo com patrocinio da marca X")).toThrow()
  })

  it("rejects a title containing the word 'venda'", () => {
    expect(() => RecommendationTitleSchema.parse("Venda de equipamentos com garantia")).toThrow()
  })

  it("rejects a title containing the word 'desconto'", () => {
    expect(() => RecommendationTitleSchema.parse("Desconto exclusivo para membros")).toThrow()
  })

  it("accepts a valid community recommendation title", () => {
    expect(RecommendationTitleSchema.parse("Algum dentista de confianca na zona leste?")).toBe(
      "Algum dentista de confianca na zona leste?",
    )
  })

  it("accepts a title asking for local service recommendations", () => {
    expect(
      RecommendationTitleSchema.parse("Onde encontrar uma boa academia na regiao central?"),
    ).toBe("Onde encontrar uma boa academia na regiao central?")
  })
})

describe("recommendation body commercial prohibition", () => {
  it("rejects a body containing 'whatsapp'", () => {
    expect(() =>
      RecommendationBodySchema.parse(
        "Entre em contato pelo whatsapp para mais informacoes sobre precos e planos.",
      ),
    ).toThrow()
  })

  it("rejects a body containing 'contratar'", () => {
    expect(() =>
      RecommendationBodySchema.parse(
        "Ligue agora para contratar nossos servicos com condicoes especiais.",
      ),
    ).toThrow()
  })

  it("rejects a body containing 'telefone'", () => {
    expect(() =>
      RecommendationBodySchema.parse(
        "Meu telefone para contato e 92 99999-9999. Atendo toda a cidade.",
      ),
    ).toThrow()
  })

  it("rejects a body containing 'pagamento'", () => {
    expect(() =>
      RecommendationBodySchema.parse(
        "Aceitamos pagamento via PIX, cartao de credito e debito. Faca seu orcamento!",
      ),
    ).toThrow()
  })

  it("rejects a body containing 'anuncio'", () => {
    expect(() =>
      RecommendationBodySchema.parse(
        "Este e um anuncio dos nossos servicos de consultoria. Agende uma visita.",
      ),
    ).toThrow()
  })

  it("rejects a body containing 'contato comercial'", () => {
    expect(() =>
      RecommendationBodySchema.parse(
        "Para contato comercial, envie um e-mail para vendas@exemplo.com.",
      ),
    ).toThrow()
  })

  it("accepts a valid community recommendation body", () => {
    expect(
      RecommendationBodySchema.parse(
        "Estou procurando um dentista que atenda na zona leste de Manaus, de preferencia com horario flexivel.",
      ),
    ).toBe(
      "Estou procurando um dentista que atenda na zona leste de Manaus, de preferencia com horario flexivel.",
    )
  })

  it("accepts a body mentioning 'clinica' without commercial context", () => {
    expect(
      RecommendationBodySchema.parse(
        "Conheco uma clinica muito boa perto do Aleixo. O atendimento e otimo e aceitam varios convenios.",
      ),
    ).toBe(
      "Conheco uma clinica muito boa perto do Aleixo. O atendimento e otimo e aceitam varios convenios.",
    )
  })
})

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
