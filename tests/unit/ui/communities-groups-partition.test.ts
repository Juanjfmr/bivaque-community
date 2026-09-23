import { describe, expect, it } from "vitest"
import {
  type CommunityGroupCard,
  partitionGroupCards,
} from "../../../apps/web/app/(shell)/communities/communities-data"

// FE-GRUPOS-ALCANCAVEIS (19/09/2026) — a regra que dá casa ao grupo de cidade.
//
// O defeito de produção: um grupo com `community_id` nulo não aparecia em tela
// nenhuma do destino Comunidades — a aba "Grupos" de uma comunidade filtra por
// `community_id`, e `/groups` (a única lista que o mostrava) não tinha entrada
// na navegação. Esta partição é o que decide onde ele aparece agora.

const CIDADE = "00000000-0000-4000-8000-000000000001"
const OUTRA_CIDADE = "00000000-0000-4000-8000-000000000002"

function group(overrides: Partial<CommunityGroupCard> & { id: string }): CommunityGroupCard {
  return {
    name: "Grupo",
    description: null,
    visibility: "public",
    localityId: CIDADE,
    cityLabel: "Manaus, AM",
    cityLevel: true,
    participating: false,
    memberCount: null,
    ...overrides,
  }
}

describe("partitionGroupCards", () => {
  it("meu grupo é meu em qualquer cidade e em qualquer escopo", () => {
    const { mine, city } = partitionGroupCards(
      [
        group({ id: "a", name: "Corrida às Terças", participating: true }),
        group({
          id: "b",
          name: "Grupo da vila",
          participating: true,
          cityLevel: false,
          localityId: OUTRA_CIDADE,
        }),
      ],
      CIDADE,
    )

    expect(mine.map((g) => g.name)).toEqual(["Corrida às Terças", "Grupo da vila"])
    expect(city).toHaveLength(0)
  })

  it("grupo de cidade em que não participo entra na descoberta da cidade", () => {
    const { mine, city } = partitionGroupCards(
      [group({ id: "corrida", name: "Corrida às Terças" })],
      CIDADE,
    )

    expect(mine).toHaveLength(0)
    expect(city.map((g) => g.id)).toEqual(["corrida"])
  })

  it("grupo de comunidade NÃO entra na descoberta — ele já tem casa na aba da comunidade", () => {
    const { city } = partitionGroupCards(
      [group({ id: "vila", name: "Grupo da vila", cityLevel: false })],
      CIDADE,
    )

    expect(city).toHaveLength(0)
  })

  it("grupo de cidade de OUTRA cidade não entra: a comparação é por localityId", () => {
    const { city } = partitionGroupCards(
      [group({ id: "fora", name: "Corrida no Rio", localityId: OUTRA_CIDADE })],
      CIDADE,
    )

    expect(city).toHaveLength(0)
  })

  it("sem cidade em exibição, a descoberta fica vazia em vez de adivinhar", () => {
    const { city } = partitionGroupCards([group({ id: "corrida" })], null)

    expect(city).toHaveLength(0)
  })

  it("ordena por nome em pt-BR nos dois lados", () => {
    const { mine, city } = partitionGroupCards(
      [
        group({ id: "3", name: "Pesca e Trilha" }),
        group({ id: "1", name: "Caminhada no Mindu" }),
        group({ id: "2", name: "Águas abertas" }),
        group({ id: "m3", name: "Trocas de Livros", participating: true }),
        group({ id: "m1", name: "Estudos para Concurso", participating: true }),
        group({ id: "m2", name: "Ábaco", participating: true }),
      ],
      CIDADE,
    )

    expect(city.map((g) => g.name)).toEqual([
      "Águas abertas",
      "Caminhada no Mindu",
      "Pesca e Trilha",
    ])
    expect(mine.map((g) => g.name)).toEqual(["Ábaco", "Estudos para Concurso", "Trocas de Livros"])
  })
})