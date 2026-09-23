import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  ASK_INDICATION_HREF,
  DEFAULT_RECOMMENDATION_TAB,
  RECOMMENDATION_TAB_IDS,
  resolveRecommendationTab,
} from "../../../apps/web/lib/recommendations/request-tab"

// DS-006: `Pedir uma indicação` precisa CHEGAR ao painel do Guia. A página não
// entendia parâmetro de aba nenhum; o produto já usava `?aba=` em /salvos
// (`?aba=guia`, salvos/page.tsx), então a mesma convenção vale aqui em vez de um
// segundo vocabulário inventado.

const root = join(import.meta.dirname, "..", "..", "..")
const page = readFileSync(
  join(root, "apps", "web", "app", "(shell)", "recommendations", "page.tsx"),
  "utf8",
)

describe("aba de /recommendations por URL (DS-006)", () => {
  it("resolve o parâmetro para a aba real, com o painel do pedido incluído", () => {
    expect(resolveRecommendationTab("request")).toBe("request")
    expect(resolveRecommendationTab("requests")).toBe("requests")
    expect(resolveRecommendationTab("saved")).toBe("saved")
    expect(resolveRecommendationTab("browse")).toBe("browse")
  })

  it("sem parâmetro ou com valor desconhecido abre em Explorar", () => {
    expect(resolveRecommendationTab(null)).toBe(DEFAULT_RECOMMENDATION_TAB)
    expect(resolveRecommendationTab(undefined)).toBe(DEFAULT_RECOMMENDATION_TAB)
    expect(resolveRecommendationTab("")).toBe(DEFAULT_RECOMMENDATION_TAB)
    expect(resolveRecommendationTab("pedir")).toBe(DEFAULT_RECOMMENDATION_TAB)
    expect(DEFAULT_RECOMMENDATION_TAB).toBe("browse")
  })

  it("o destino da Home usa o parâmetro que a página lê", () => {
    expect(ASK_INDICATION_HREF).toBe("/recommendations?aba=request")
    expect(page).toContain('searchParams.get("aba")')
    expect(page).toContain('resolveRecommendationTab(searchParams.get("aba"))')
    // O parâmetro é lido uma segunda vez para o caso de a página já estar
    // montada quando o link chega.
    expect(page.match(/searchParams\.get\("aba"\)/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })

  it("o foco por pedido continua funcionando junto do parâmetro novo", () => {
    expect(page).toContain('searchParams.get("focus")')
    expect(page).toContain('setSelectedTab("requests")')
  })

  it("os quatro ids de aba continuam sendo os das abas marcadas na página", () => {
    for (const id of RECOMMENDATION_TAB_IDS) {
      expect(page).toContain(`hidden={selectedTab !== "${id}"}`)
    }
  })
})
