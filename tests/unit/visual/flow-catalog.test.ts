import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
// @ts-expect-error — módulo .mjs sem tipos; o teste é a verificação do contrato.
import { loadFlowCatalog } from "../../../scripts/visual/flows/catalog.mjs"

// O catálogo é a fusão das três fontes. Este teste garante que a fusão não perde nem inventa:
// um fluxo por prancha, um passo por tela, e cada passo com o recorte correspondente.

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url))
const manifest = JSON.parse(
  readFileSync(
    join(repoRoot, "docs", "design", "visual-guide-2026-09-06", "manifest.json"),
    "utf8",
  ),
) as { artifacts: Array<{ id: string; title: string; kind: string; screens: string[] }> }

type Step = { index: number; label: string; frame: { x: number; w: number } }
type Flow = {
  id: string
  title: string
  platform: string
  group: { id: string; label: string }
  actions: string[]
  steps: Step[]
}

const { flows } = loadFlowCatalog() as { flows: Flow[] }

describe("catálogo de fluxos", () => {
  it("produz um fluxo por prancha, com id único", () => {
    expect(flows.map((f) => f.id).sort()).toEqual(manifest.artifacts.map((a) => a.id).sort())
    expect(new Set(flows.map((f) => f.id)).size).toBe(flows.length)
  })

  it("dá a cada fluxo um passo por tela da prancha, na ordem", () => {
    const problems: string[] = []
    for (const flow of flows) {
      const artifact = manifest.artifacts.find((a) => a.id === flow.id)
      if (!artifact) {
        problems.push(`${flow.id}: sem prancha no manifest`)
        continue
      }
      if (flow.steps.length !== artifact.screens.length) {
        problems.push(
          `${flow.id}: ${flow.steps.length} passos para ${artifact.screens.length} telas`,
        )
      }
      flow.steps.forEach((step, i) => {
        if (step.index !== i + 1) problems.push(`${flow.id}: passo ${i} com índice ${step.index}`)
        if (!step.label?.trim()) problems.push(`${flow.id}: passo ${i + 1} sem rótulo`)
        if (step.label !== artifact.screens[i]) {
          problems.push(
            `${flow.id}: passo ${i + 1} não corresponde à tela "${artifact.screens[i]}"`,
          )
        }
      })
    }
    expect(problems, problems.join("\n")).toEqual([])
  })

  it("carrega grupo canônico, plataforma e tags em todo fluxo", () => {
    const problems: string[] = []
    for (const flow of flows) {
      if (!flow.group.id || !flow.group.label) problems.push(`${flow.id}: grupo incompleto`)
      if (!["mobile", "web"].includes(flow.platform)) {
        problems.push(`${flow.id}: plataforma "${flow.platform}"`)
      }
      if (!flow.actions.length) problems.push(`${flow.id}: sem tags`)
      if (!flow.title?.trim()) problems.push(`${flow.id}: sem título`)
    }
    expect(problems, problems.join("\n")).toEqual([])
  })

  it("mantém cada recorte dentro dos limites do quadro", () => {
    const problems: string[] = []
    for (const flow of flows) {
      for (const step of flow.steps) {
        const { x, w } = step.frame
        if (x < 0 || w <= 0 || x + w > 1.0001) {
          problems.push(`${flow.id} passo ${step.index}: recorte fora dos limites`)
        }
      }
    }
    expect(problems, problems.join("\n")).toEqual([])
  })
})
