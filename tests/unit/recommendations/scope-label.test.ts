import { describe, expect, it } from "vitest"
import { localityScopeLabel } from "../../../apps/web/lib/recommendations/scope-label"

// DS-006 (reparo MEDIUM-1): o chip de alcance fala do PEDIDO, não de quem lê.
// Sem fixture de segunda cidade no seed, a correção é verificável aqui: o caso
// "outra localidade" não pode receber o nome da cidade da sessão.

const MANAUS = "00000000-0000-4000-8000-000000000001"
const RECIFE = "00000000-0000-4000-8000-000000000002"

describe("rótulo de alcance do pedido (DS-006)", () => {
  it("pedido da própria cidade usa o nome dela", () => {
    expect(
      localityScopeLabel({
        groupId: null,
        localityId: MANAUS,
        currentId: MANAUS,
        currentCityName: "Manaus",
        outbound: null,
      }),
    ).toBe("Manaus")
  })

  it("pedido de outra cidade NÃO recebe a cidade de quem lê", () => {
    const label = localityScopeLabel({
      groupId: null,
      localityId: RECIFE,
      currentId: MANAUS,
      currentCityName: "Manaus",
      outbound: null,
    })
    expect(label).not.toBe("Manaus")
    expect(label).toBe("Outra cidade")
  })

  it("a outra cidade conhecida (destino declarado) é nomeada com o nome real", () => {
    expect(
      localityScopeLabel({
        groupId: null,
        localityId: RECIFE,
        currentId: MANAUS,
        currentCityName: "Manaus",
        outbound: { id: RECIFE, cityName: "Recife" },
      }),
    ).toBe("Recife")
  })

  it("pedido escopado a grupo diz Grupo, com ou sem localidade", () => {
    expect(
      localityScopeLabel({
        groupId: "grupo-1",
        localityId: null,
        currentId: MANAUS,
        currentCityName: "Manaus",
        outbound: null,
      }),
    ).toBe("Grupo")
    expect(
      localityScopeLabel({
        groupId: "grupo-1",
        localityId: MANAUS,
        currentId: MANAUS,
        currentCityName: "Manaus",
        outbound: null,
      }),
    ).toBe("Grupo")
  })

  it("pedido sem localidade e sem grupo não afirma cidade nenhuma", () => {
    expect(
      localityScopeLabel({
        groupId: null,
        localityId: null,
        currentId: MANAUS,
        currentCityName: "Manaus",
        outbound: null,
      }),
    ).toBe("Outra cidade")
  })
})
