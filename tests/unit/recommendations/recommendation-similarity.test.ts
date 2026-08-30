import { describe, expect, it } from "vitest"
import {
  hasUsefulRecommendationQuery,
  rankSimilarRecommendationRequests,
  recommendationTextSimilarity,
  type RecommendationSimilarityCandidate,
} from "../../../apps/web/lib/recommendation-similarity"

const BASE: RecommendationSimilarityCandidate[] = [
  {
    id: "same-locality",
    category: "servicos_locais",
    locality_id: "manaus",
    group_id: null,
    title: "Indicação de costureira em Manaus",
    body: "Procuro costureira para pequenos ajustes em uniforme e roupa social.",
    created_at: "2026-08-20T12:00:00Z",
    is_resolved: false,
  },
  {
    id: "other-locality",
    category: "servicos_locais",
    locality_id: "rio",
    group_id: null,
    title: "Costureira de confiança",
    body: "Alguém indica costureira para ajuste de roupa?",
    created_at: "2026-08-21T12:00:00Z",
    is_resolved: false,
  },
  {
    id: "same-group",
    category: "servicos_locais",
    locality_id: null,
    group_id: "ajuricaba",
    title: "Costureira perto da vila",
    body: "Preciso ajustar duas calças.",
    created_at: "2026-08-22T12:00:00Z",
    is_resolved: false,
  },
  {
    id: "wrong-category",
    category: "moradia",
    locality_id: "manaus",
    group_id: null,
    title: "Costureira no bairro",
    body: "Procuro indicação.",
    created_at: "2026-08-23T12:00:00Z",
    is_resolved: false,
  },
]

describe("recommendation convergence similarity", () => {
  it("ignores generic request language and keeps the useful subject", () => {
    expect(
      recommendationTextSimilarity(
        "Preciso de indicação de costureira",
        "Alguém conhece uma costureira de confiança?",
      ),
    ).toBeGreaterThan(0.5)
  })

  it("folds accents and conservative plural variants", () => {
    expect(recommendationTextSimilarity("transportadoras", "Transportadora para mudança")).toBe(1)
  })

  it("does not search noise-only input", () => {
    expect(hasUsefulRecommendationQuery("Quero indicação", "Alguém indica?")).toBe(false)
  })

  it("keeps candidates inside the exact locality and category", () => {
    const ranked = rankSimilarRecommendationRequests(
      {
        category: "servicos_locais",
        locality_id: "manaus",
        group_id: null,
        title: "Procuro costureira",
        body: "Preciso ajustar roupa social.",
      },
      BASE,
    )

    expect(ranked.map((item) => item.id)).toEqual(["same-locality"])
  })

  it("never treats a group request as equivalent to a locality request", () => {
    const ranked = rankSimilarRecommendationRequests(
      {
        category: "servicos_locais",
        locality_id: null,
        group_id: "ajuricaba",
        title: "Costureira",
        body: "Preciso ajustar uma calça.",
      },
      BASE,
    )

    expect(ranked.map((item) => item.id)).toEqual(["same-group"])
  })

  it("does not return a semantically unrelated request", () => {
    const ranked = rankSimilarRecommendationRequests(
      {
        category: "servicos_locais",
        locality_id: "manaus",
        group_id: null,
        title: "Eletricista residencial",
        body: "Preciso revisar a fiação do apartamento.",
      },
      BASE,
    )

    expect(ranked).toEqual([])
  })
})
