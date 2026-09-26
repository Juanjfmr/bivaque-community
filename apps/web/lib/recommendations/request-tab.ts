// DS-006 — a aba de /recommendations também chega pela URL.
//
// O produto já tinha essa forma em /salvos (`?aba=guia`, salvos/page.tsx:37-41):
// quem manda um link escolhe a aba, e a página abre nela em vez de prometer um
// destino que aterrissa em "Explorar". A Home usa o MESMO parâmetro para
// `Pedir uma indicação` chegar ao painel do Guia — um parâmetro novo aqui
// inventaria uma segunda convenção para a mesma coisa.
//
// A lista de ids é a das abas reais (TAB_IDS de tests/unit/recommendations/
// recon-043-abas-marcacao.test.ts). Ela existe para validar o parâmetro, não
// para gerar a marcação: os `<Tabs.Tab id="...">` continuam literais na página.

export const RECOMMENDATION_TAB_IDS = ["browse", "request", "requests", "saved"] as const

export type RecommendationTabId = (typeof RECOMMENDATION_TAB_IDS)[number]

/** Sem parâmetro (ou com valor desconhecido) a página abre em "Explorar". */
export const DEFAULT_RECOMMENDATION_TAB: RecommendationTabId = "browse"

export function resolveRecommendationTab(value: string | null | undefined): RecommendationTabId {
  return RECOMMENDATION_TAB_IDS.find((id) => id === value) ?? DEFAULT_RECOMMENDATION_TAB
}
