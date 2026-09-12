import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
// @ts-expect-error — módulo .mjs sem tipos; o teste é a verificação do contrato.
import { loadFlowCatalog } from "../../../scripts/visual/flows/catalog.mjs"

// O catálogo é a fusão das fontes. Aqui se trava o que a fusão não pode perder nem inventar:
// um fluxo por prancha, uma jornada com começo e fim, cada passo citando uma tela existente, e
// nenhuma tela das pranchas fora de qualquer jornada.

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url))
const manifest = JSON.parse(
  readFileSync(
    join(repoRoot, "docs", "design", "visual-guide-2026-09-06", "manifest.json"),
    "utf8",
  ),
) as { artifacts: Array<{ id: string; title: string; kind: string; screens: string[] }> }

type Step = { ref: string; fase: string; tela: string; frame: { x: number; w: number } }
type Journey = {
  id: string
  titulo: string
  plataforma: string
  grupo: { id: string; label: string }
  acoes: string[]
  passos: Step[]
  variantes: Step[]
}
type Flow = { id: string; steps: Array<{ frame: { x: number; w: number } }> }

const { flows, journeys } = loadFlowCatalog() as { flows: Flow[]; journeys: Journey[] }

describe("fluxos (pranchas)", () => {
  it("produz um fluxo por prancha, com id único", () => {
    expect(flows.map((f) => f.id).sort()).toEqual(manifest.artifacts.map((a) => a.id).sort())
  })
})

describe("jornadas", () => {
  it("tem id único, ao menos um passo e tags", () => {
    const problems: string[] = []
    const seen = new Set<string>()
    for (const journey of journeys) {
      if (seen.has(journey.id)) problems.push(`${journey.id}: duplicada`)
      seen.add(journey.id)
      if (!journey.passos.length) problems.push(`${journey.id}: sem passos`)
      if (!journey.acoes.length) problems.push(`${journey.id}: sem tags`)
      if (!["mobile", "web"].includes(journey.plataforma)) {
        problems.push(`${journey.id}: plataforma "${journey.plataforma}"`)
      }
    }
    expect(problems, problems.join("\n")).toEqual([])
  })

  it("começa em início e termina em fim", () => {
    const problems: string[] = []
    for (const journey of journeys) {
      const first = journey.passos[0]
      const last = journey.passos[journey.passos.length - 1]
      if (first && first.fase !== "início")
        problems.push(`${journey.id}: primeiro passo não é início`)
      if (journey.passos.length > 1 && last && last.fase !== "fim") {
        problems.push(`${journey.id}: último passo não é fim`)
      }
    }
    expect(problems, problems.join("\n")).toEqual([])
  })

  it("cita telas existentes, com o recorte dentro do quadro", () => {
    const problems: string[] = []
    for (const journey of journeys) {
      for (const step of [...journey.passos, ...journey.variantes]) {
        const { x, w } = step.frame
        if (!step.tela?.trim()) problems.push(`${journey.id} ${step.ref}: sem tela`)
        if (x < 0 || w <= 0 || x + w > 1.0001) {
          problems.push(`${journey.id} ${step.ref}: recorte inválido`)
        }
      }
    }
    expect(problems, problems.join("\n")).toEqual([])
  })

  it("deixa toda tela das pranchas dentro de alguma jornada", () => {
    const used = new Set<string>()
    for (const journey of journeys) {
      for (const step of [...journey.passos, ...journey.variantes]) used.add(step.ref)
    }
    const orphan: string[] = []
    for (const artifact of manifest.artifacts) {
      artifact.screens.forEach((_screen, index) => {
        const ref = `${artifact.id}#${index}`
        if (!used.has(ref)) orphan.push(ref)
      })
    }
    expect(orphan, `telas fora de qualquer jornada: ${orphan.join(", ")}`).toEqual([])
  })
})
