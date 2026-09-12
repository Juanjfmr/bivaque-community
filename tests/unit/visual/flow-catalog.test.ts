import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
// @ts-expect-error — módulo .mjs sem tipos; o teste é a verificação do contrato.
import { loadFlowCatalog } from "../../../scripts/visual/flows/catalog.mjs"

// O catálogo é a fusão das fontes. Aqui se trava o que a fusão não pode perder nem inventar:
// um fluxo por prancha; uma jornada com etapas nomeadas, começo e fim; uma ação em cada
// transição; desvio ancorado num passo real; e nenhuma tela das pranchas fora de alguma jornada.

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url))
const manifest = JSON.parse(
  readFileSync(
    join(repoRoot, "docs", "design", "visual-guide-2026-09-06", "manifest.json"),
    "utf8",
  ),
) as { artifacts: Array<{ id: string; title: string; kind: string; screens: string[] }> }

type Step = {
  ref: string
  fase: string
  tela: string
  acao: string
  posicao: number
  frame: { x: number; w: number }
}
type Etapa = { nome: string; passos: Step[] }
type Desvio = Step & { quando: string; apos: string }
type Journey = {
  id: string
  titulo: string
  plataforma: string
  persona: string
  grupo: { id: string; label: string }
  acoes: string[]
  etapas: Etapa[]
  passos: Step[]
  desvios: Desvio[]
}
type Flow = { id: string; steps: Array<{ frame: { x: number; w: number } }> }

const { flows, journeys } = loadFlowCatalog() as { flows: Flow[]; journeys: Journey[] }

describe("fluxos (pranchas)", () => {
  it("produz um fluxo por prancha, com id único", () => {
    expect(flows.map((f) => f.id).sort()).toEqual(manifest.artifacts.map((a) => a.id).sort())
  })
})

describe("jornadas", () => {
  it("tem id único, persona, tags e etapas", () => {
    const problems: string[] = []
    const seen = new Set<string>()
    for (const journey of journeys) {
      if (seen.has(journey.id)) problems.push(`${journey.id}: duplicada`)
      seen.add(journey.id)
      if (!journey.persona?.trim()) problems.push(`${journey.id}: sem persona`)
      if (!journey.acoes.length) problems.push(`${journey.id}: sem tags`)
      if (!journey.etapas.length) problems.push(`${journey.id}: sem etapas`)
      if (!["mobile", "web"].includes(journey.plataforma)) {
        problems.push(`${journey.id}: plataforma "${journey.plataforma}"`)
      }
      for (const etapa of journey.etapas) {
        if (!etapa.nome?.trim()) problems.push(`${journey.id}: etapa sem nome`)
        if (!etapa.passos.length) problems.push(`${journey.id}/${etapa.nome}: etapa sem passos`)
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

  it("dá uma ação a cada transição, exceto a última", () => {
    const problems: string[] = []
    for (const journey of journeys) {
      journey.passos.slice(0, -1).forEach((passo) => {
        if (!passo.acao?.trim()) problems.push(`${journey.id}: passo ${passo.posicao} sem ação`)
      })
    }
    expect(problems, problems.join("\n")).toEqual([])
  })

  it("ancora cada desvio num passo da própria jornada", () => {
    const problems: string[] = []
    for (const journey of journeys) {
      const refs = new Set(journey.passos.map((p) => p.ref))
      for (const desvio of journey.desvios) {
        if (!desvio.quando?.trim())
          problems.push(`${journey.id} ${desvio.ref}: desvio sem "quando"`)
        if (!refs.has(desvio.apos)) {
          problems.push(`${journey.id} ${desvio.ref}: ancora inexistente (${desvio.apos})`)
        }
      }
    }
    expect(problems, problems.join("\n")).toEqual([])
  })

  it("mantém cada recorte dentro do quadro", () => {
    const problems: string[] = []
    for (const journey of journeys) {
      for (const step of [...journey.passos, ...journey.desvios]) {
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
      for (const step of [...journey.passos, ...journey.desvios]) used.add(step.ref)
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
