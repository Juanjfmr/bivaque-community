import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

// A taxonomia é a única camada editorial do mapeamento de jornadas: traduz o `group` cru do
// manifest (que tem sinônimos conviventes) para um fluxo canônico e dá a cada prancha as suas
// tags de ação. Este teste é o contrato: sem ele, um grupo novo ou uma tag torta passa silencioso
// e a galeria publica um fluxo que não existe.

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url))
const guideDir = join(repoRoot, "docs", "design", "visual-guide-2026-09-06")

type Artifact = { id: string; kind: string; group: string; screens: string[] }
type Group = { id: string; label: string; aliases: string[] }
type Taxonomy = {
  groups: Group[]
  actionVocabulary: string[]
  flows: Record<string, { actions: string[] }>
}

const manifest = JSON.parse(readFileSync(join(guideDir, "manifest.json"), "utf8")) as {
  artifacts: Artifact[]
}
const taxonomy = JSON.parse(
  readFileSync(join(repoRoot, "scripts", "visual", "flows", "taxonomy.json"), "utf8"),
) as Taxonomy

const artifactIds = manifest.artifacts.map((a) => a.id).sort()
const aliasToGroup = new Map<string, string>()

describe("taxonomia dos fluxos das pranchas", () => {
  it("mapeia cada grupo do manifest para exatamente um grupo canônico", () => {
    const duplicated: string[] = []
    for (const group of taxonomy.groups) {
      for (const alias of group.aliases) {
        if (aliasToGroup.has(alias)) {
          duplicated.push(`${alias} (${aliasToGroup.get(alias)} e ${group.id})`)
        }
        aliasToGroup.set(alias, group.id)
      }
    }
    expect(duplicated, `alias duplicado: ${duplicated.join(", ")}`).toEqual([])

    const unmapped = manifest.artifacts
      .filter((a) => !aliasToGroup.has(a.group))
      .map((a) => `${a.id} (grupo "${a.group}")`)
    expect(unmapped, `grupo sem canônico: ${unmapped.join(", ")}`).toEqual([])
  })

  it("tem exatamente um fluxo por prancha, sem fluxo órfão", () => {
    expect(Object.keys(taxonomy.flows).sort()).toEqual(artifactIds)
  })

  it("toda prancha tem tag, e toda tag vem do vocabulário controlado", () => {
    const vocabulary = new Set(taxonomy.actionVocabulary)
    const problems: string[] = []
    for (const [id, flow] of Object.entries(taxonomy.flows)) {
      const actions = flow.actions ?? []
      if (actions.length === 0) problems.push(`${id}: sem tag`)
      for (const tag of actions) {
        if (!vocabulary.has(tag)) problems.push(`${id}: tag fora do vocabulário "${tag}"`)
      }
    }
    expect(problems, problems.join("\n")).toEqual([])
  })

  it("mantém o vocabulário sem duplicata e sem entrada vazia", () => {
    const vocabulary = taxonomy.actionVocabulary
    expect(new Set(vocabulary).size).toBe(vocabulary.length)
    expect(vocabulary.filter((tag) => tag.trim() === "")).toEqual([])
  })

  it("mantém todo grupo canônico alcançável pelo próprio id", () => {
    const unreachable = taxonomy.groups
      .filter((group) => !group.aliases.includes(group.id))
      .map((group) => group.id)
    expect(unreachable, `grupo sem alias para o próprio id: ${unreachable.join(", ")}`).toEqual([])
  })
})
