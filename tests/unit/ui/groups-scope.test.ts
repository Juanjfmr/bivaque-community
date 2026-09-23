import { describe, expect, it } from "vitest"
import { resolveGroupsScope } from "../../../apps/web/app/(shell)/groups/groups-scope"
import type { LocalityCurrent, LocalityOutbound } from "../../../apps/web/lib/locality-context"

// FE-GRUPOS-ALCANCAVEIS — o defeito de produção era a página resolver a cidade
// por conta própria (`.limit(1)` sem `kind`), pegando a linha `leaving` de quem
// tinha transferência declarada e listando os grupos da cidade de ORIGEM
// enquanto o shell mostrava a de destino. Esta função é a resolução única.

const MANAUS: LocalityCurrent = {
  id: "00000000-0000-4000-8000-000000000001",
  cityName: "Manaus",
  stateCode: "AM",
}

const RIO: LocalityOutbound = {
  id: "a219e4f2-db9b-404b-9f27-49b1fbfeb40f",
  cityName: "Rio de Janeiro",
  stateCode: "RJ",
  endsAt: "2026-12-20",
  readOnly: false,
}

describe("resolveGroupsScope", () => {
  it("sem transferência, a lista é de uma cidade só", () => {
    const scope = resolveGroupsScope(MANAUS, null)

    expect(scope.localityIds).toEqual([MANAUS.id])
    expect(scope.multipleCities).toBe(false)
    expect(scope.headline).toBe("Grupos da sua cidade.")
  })

  it("com transferência, a cidade corrente vem primeiro e a de saída continua na lista", () => {
    const current: LocalityCurrent = {
      id: RIO.id,
      cityName: RIO.cityName,
      stateCode: RIO.stateCode,
    }
    const scope = resolveGroupsScope(current, { ...RIO, ...MANAUS, id: MANAUS.id })

    expect(scope.localityIds).toEqual([RIO.id, MANAUS.id])
    expect(scope.multipleCities).toBe(true)
    expect(scope.headline).toBe("Grupos das suas cidades.")
    expect(scope.cityLabelByLocalityId.get(RIO.id)).toBe("Rio de Janeiro, RJ")
    expect(scope.cityLabelByLocalityId.get(MANAUS.id)).toBe("Manaus, AM")
  })

  it("vínculo de saída para a própria cidade corrente não duplica a cidade", () => {
    const scope = resolveGroupsScope(MANAUS, {
      ...RIO,
      id: MANAUS.id,
      cityName: "Manaus",
      stateCode: "AM",
    })

    expect(scope.localityIds).toEqual([MANAUS.id])
    expect(scope.multipleCities).toBe(false)
  })

  it("sem UF, o rótulo é só o nome da cidade — nunca uma vírgula solta", () => {
    const scope = resolveGroupsScope({ ...MANAUS, stateCode: "" }, null)

    expect(scope.cityLabelByLocalityId.get(MANAUS.id)).toBe("Manaus")
  })
})
