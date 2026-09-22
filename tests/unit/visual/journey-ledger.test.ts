import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  findJourney,
  type JourneyDef,
  type JourneyDoc,
  JourneyLedger,
} from "../../e2e/helpers/journey-ledger"

// O registro é o que impede a jornada simulada de mentir: não aceita passo que a jornada não
// cita, não conclui com passo faltando e não deixa lacuna passar sem motivo.

const JOURNEY: JourneyDef = {
  id: "web-exemplo",
  titulo: "Exemplo",
  persona: "Membro",
  etapas: [
    { nome: "Entrada", passos: [{ tela: "10-a#0", acao: "entra" }, { tela: "10-a#1" }] },
    { nome: "Fim", passos: [{ tela: "11-b#0" }] },
  ],
  desvios: [{ tela: "10-a#2", apos: "10-a#0", quando: "falha" }, "estado sem tela"],
}

describe("registro de jornada simulada", () => {
  it("conclui quando todo passo foi observado, na ordem registrada", () => {
    const ledger = new JourneyLedger(JOURNEY)
    ledger.record("passo", "10-a#0", "observado", { url: "/a" })
    ledger.record("passo", "10-a#1", "observado")
    ledger.record("passo", "11-b#0", "observado")

    const summary = ledger.conclude()

    expect(summary.estado).toBe("concluida")
    expect(summary.registros.map((entry) => entry.ref)).toEqual(["10-a#0", "10-a#1", "11-b#0"])
    expect(summary.registros[0]).toMatchObject({ etapa: "Entrada", acao: "entra", url: "/a" })
    expect(summary.desviosNaoExercitados).toEqual(["10-a#2"])
  })

  it("recusa concluir com passo sem registro", () => {
    const ledger = new JourneyLedger(JOURNEY)
    ledger.record("passo", "10-a#0", "observado")

    expect(() => ledger.conclude()).toThrow(/10-a#1, 11-b#0/)
    expect(ledger.summary().estado).toBe("incompleta")
  })

  it("recusa passo que a jornada não cita", () => {
    const ledger = new JourneyLedger(JOURNEY)
    expect(() => ledger.record("passo", "99-z#0", "observado")).toThrow(/não tem o passo/)
  })

  it("recusa como passo uma tela que só existe como desvio", () => {
    const ledger = new JourneyLedger(JOURNEY)
    expect(() => ledger.record("passo", "10-a#2", "observado")).toThrow(/não tem o passo/)
    expect(ledger.record("desvio", "10-a#2", "observado").quando).toBe("falha")
  })

  it("recusa registro duplicado", () => {
    const ledger = new JourneyLedger(JOURNEY)
    ledger.record("passo", "10-a#0", "observado")
    expect(() => ledger.record("passo", "10-a#0", "observado")).toThrow(/já registrado/)
  })

  it("lacuna exige motivo e conta separado do observado", () => {
    const ledger = new JourneyLedger(JOURNEY)
    expect(() => ledger.record("passo", "10-a#0", "lacuna")).toThrow(/exige motivo/)
    expect(() => ledger.record("passo", "10-a#0", "lacuna", { motivo: "  " })).toThrow()

    ledger.record("passo", "10-a#0", "lacuna", { motivo: "o app ainda não tem a tela" })
    ledger.record("passo", "10-a#1", "observado")
    ledger.record("passo", "11-b#0", "observado")

    const summary = ledger.conclude()
    expect(summary.lacunas).toBe(1)
    expect(summary.registros[0]?.motivo).toBe("o app ainda não tem a tela")
  })

  it("atalho é observado, mas contado e exige motivo", () => {
    const ledger = new JourneyLedger(JOURNEY)
    expect(() => ledger.record("passo", "10-a#0", "observado", { atalho: "" })).toThrow(
      /atalho em 10-a#0 exige motivo/,
    )
    ledger.record("passo", "10-a#0", "observado", { atalho: "nenhum link leva à lista" })
    ledger.record("passo", "10-a#1", "observado")
    ledger.record("passo", "11-b#0", "observado")

    const summary = ledger.conclude()
    expect(summary.atalhos).toBe(1)
    expect(summary.lacunas).toBe(0)
    expect(summary.registros[1]?.atalho).toBeNull()
  })

  it("não aceita registro depois de concluída", () => {
    const ledger = new JourneyLedger({
      ...JOURNEY,
      etapas: [JOURNEY.etapas[1] ?? JOURNEY.etapas[0]],
    })
    ledger.record("passo", "11-b#0", "observado")
    ledger.conclude()
    expect(() => ledger.record("desvio", "10-a#2", "observado")).toThrow(/já concluída/)
  })

  it("as jornadas do piloto existem no mapa real", () => {
    const doc = JSON.parse(
      readFileSync(join(process.cwd(), "scripts", "visual", "flows", "journeys.json"), "utf8"),
    ) as JourneyDoc
    for (const id of [
      "web-pedir-um-servico",
      "web-responder-um-pedido",
      "web-entrar-e-ser-admitido",
      "web-operar-admissoes",
      "web-quando-algo-falha",
    ]) {
      expect(findJourney(doc, id).id).toBe(id)
    }
    expect(() => findJourney(doc, "web-inexistente")).toThrow(/inexistente/)
  })
})
