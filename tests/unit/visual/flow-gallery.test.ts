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

type Step = {
  tela: string
  fase?: string
  arquivo: string
  frame: { x: number; y: number; w: number; h: number }
}
type Item = { id: string; titulo: string; passos: Step[]; variantes?: Step[] }

const manifest = JSON.parse(readFileSync(join(guideDir, "manifest.json"), "utf8")) as {
  artifacts: Array<{ id: string; title: string; screens: string[] }>
}

const html = readFileSync(join(guideDir, "flows.html"), "utf8")
const match = html.match(/<script id="dataset" type="application\/json">([\s\S]*?)<\/script>/)
if (!match) throw new Error("flows.html sem o dataset embutido")
const data = JSON.parse(match[1]) as { jornadas: Item[]; pranchas: Item[] }

const inBounds = (step: Step) => {
  const { x, y, w, h } = step.frame
  return x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 1.0001 && y + h <= 1.0001
}

describe("flows.html — artefato gerado", () => {
  it("carrega jornadas e pranchas, com id único cada", () => {
    expect(data.jornadas.length).toBeGreaterThan(0)
    expect(new Set(data.jornadas.map((j) => j.id)).size).toBe(data.jornadas.length)
    expect(new Set(data.pranchas.map((p) => p.id)).size).toBe(data.pranchas.length)
    expect(data.pranchas.map((p) => p.id).sort()).toEqual(
      manifest.artifacts.map((a) => a.id).sort(),
    )
  })

  it("ordena toda jornada de início a fim", () => {
    const problems: string[] = []
    for (const journey of data.jornadas) {
      const first = journey.passos[0]
      const last = journey.passos[journey.passos.length - 1]
      if (first && first.fase !== "início") problems.push(`${journey.id}: primeiro não é início`)
      if (journey.passos.length > 1 && last && last.fase !== "fim") {
        problems.push(`${journey.id}: último não é fim`)
      }
    }
    expect(problems, problems.join("\n")).toEqual([])
  })

  it("mantém todo recorte dentro do quadro e aponta para um PNG existente", () => {
    const problems: string[] = []
    for (const item of [...data.jornadas, ...data.pranchas]) {
      for (const step of [...item.passos, ...(item.variantes ?? [])]) {
        if (!inBounds(step)) problems.push(`${item.id} ${step.tela}: recorte fora dos limites`)
        if (!existsSync(join(guideDir, step.arquivo))) {
          problems.push(`${item.id} ${step.tela}: PNG ausente (${step.arquivo})`)
        }
      }
    }
    expect(problems, problems.join("\n")).toEqual([])
  })

  it("não embute data nem revisão — o artefato é determinístico", () => {
    const serialized = JSON.stringify(data)
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

  it("lista cada jornada e linka a galeria", () => {
    const content = readFileSync(flowsMdPath, "utf8")
    const missing = data.jornadas
      .filter((journey) => !content.includes(journey.titulo))
      .map((journey) => journey.id)
    expect(missing, `jornada ausente no índice: ${missing.join(", ")}`).toEqual([])
    expect(content).toContain("../design/visual-guide-2026-09-06/flows.html")
  })
})
