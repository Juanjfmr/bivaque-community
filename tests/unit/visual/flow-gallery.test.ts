import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

// Verifica os artefatos GERADOS (flows.html e FLOWS.md) contra o manifesto. O catálogo em si é
// travado por flow-catalog.test.ts; aqui o alvo é a sincronia do que foi publicado — um artefato
// gerado e não regenerado passa despercebido sem isto. A igualdade byte a byte com o gerador é
// coberta por `flows-gallery.mjs --check` e `flows-verify.mjs --check`.

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url))
const guideDir = join(repoRoot, "docs", "design", "visual-guide-2026-09-06")
const flowsMdPath = join(repoRoot, "docs", "journeys", "FLOWS.md")

type Artifact = { id: string; title: string; screens: string[] }
type Step = { index: number; frame: { x: number; y: number; w: number; h: number } }
type Flow = { id: string; title: string; prancha: { file: string }; steps: Step[] }

const manifest = JSON.parse(readFileSync(join(guideDir, "manifest.json"), "utf8")) as {
  artifacts: Artifact[]
}

const html = readFileSync(join(guideDir, "flows.html"), "utf8")
const match = html.match(/<script id="dataset" type="application\/json">([\s\S]*?)<\/script>/)
if (!match) throw new Error("flows.html sem o dataset embutido")
const payload = JSON.parse(match[1]) as { flows: Flow[] }
const flows = payload.flows

describe("flows.html — artefato gerado", () => {
  it("carrega um fluxo por prancha do manifesto, com id único", () => {
    expect(flows.map((f) => f.id).sort()).toEqual(manifest.artifacts.map((a) => a.id).sort())
  })

  it("dá a cada fluxo um passo por tela, com rótulo vindo da prancha", () => {
    const problems: string[] = []
    for (const flow of flows) {
      const artifact = manifest.artifacts.find((a) => a.id === flow.id)
      if (!artifact) {
        problems.push(`${flow.id}: fora do manifesto`)
        continue
      }
      if (flow.steps.length !== artifact.screens.length) {
        problems.push(
          `${flow.id}: ${flow.steps.length} passos para ${artifact.screens.length} telas`,
        )
      }
    }
    expect(problems, problems.join("\n")).toEqual([])
  })

  it("mantém todo recorte dentro do quadro", () => {
    const problems: string[] = []
    for (const flow of flows) {
      for (const step of flow.steps) {
        const { x, y, w, h } = step.frame
        if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1.0001 || y + h > 1.0001) {
          problems.push(`${flow.id} passo ${step.index}: recorte fora dos limites`)
        }
      }
    }
    expect(problems, problems.join("\n")).toEqual([])
  })

  it("aponta para um PNG que existe no guia", () => {
    const missing = flows
      .filter((flow) => !existsSync(join(guideDir, flow.prancha.file)))
      .map((flow) => `${flow.id}: ${flow.prancha.file}`)
    expect(missing, `PNG ausente: ${missing.join(", ")}`).toEqual([])
  })

  it("não embute data nem revisão — o artefato é determinístico", () => {
    const serialized = JSON.stringify(payload)
    expect(serialized).not.toContain("generatedAt")
    expect(serialized).not.toContain("revision")
  })

  it("preserva a proporção da imagem no recorte, com height:auto sobre o atributo", () => {
    // Sem height:auto o atributo height do <img> vence e a imagem vira 225x1024 na moldura de 150px.
    expect(html).toMatch(/\.frame img\{[^}]*height:auto/)
  })
})

describe("FLOWS.md — índice gerado", () => {
  it("existe em docs/journeys/", () => {
    expect(existsSync(flowsMdPath), `FLOWS.md ausente em ${flowsMdPath}`).toBe(true)
  })

  it("lista o título de cada fluxo e linka a galeria", () => {
    const content = readFileSync(flowsMdPath, "utf8")
    const missing = manifest.artifacts
      .filter((artifact) => !content.includes(artifact.title))
      .map((artifact) => artifact.id)
    expect(missing, `título ausente no índice: ${missing.join(", ")}`).toEqual([])
    expect(content).toContain("../design/visual-guide-2026-09-06/flows.html")
  })
})
