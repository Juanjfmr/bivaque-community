// Catálogo de fluxos: funde as três fontes num só modelo.
//
//   manifest.json  -> identidade da prancha (título, telas, status, notas, arquivo)
//   taxonomy.json  -> grupo canônico, tags de ação e vocabulário
//   frames.json    -> geometria de recorte de cada quadro
//
// O resultado é o que o gerador da galeria consome e o que o teste trava. Nada aqui lê o
// runtime: a fonte é o guia visual, e o fluxo é a prancha.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const here = fileURLToPath(new URL(".", import.meta.url))
const repoRoot = join(here, "..", "..", "..")

export const GUIDE_DIR = join(repoRoot, "docs", "design", "visual-guide-2026-09-06")

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"))

/**
 * @param {{ artifacts: Array<any> }} manifest
 * @param {{ groups: Array<any>, actionVocabulary: string[], flows: Record<string, any> }} taxonomy
 * @param {{ boards: Record<string, any> }} frames
 */
export function buildFlows(manifest, taxonomy, frames) {
  const groupsById = new Map(taxonomy.groups.map((group) => [group.id, group]))
  const groupByAlias = new Map()
  for (const group of taxonomy.groups) {
    for (const alias of group.aliases) groupByAlias.set(alias, group.id)
  }

  return manifest.artifacts.map((artifact) => {
    const groupId = groupByAlias.get(artifact.group)
    const group = groupsById.get(groupId)
    const board = frames.boards[artifact.id]
    const meta = taxonomy.flows[artifact.id]

    return {
      id: artifact.id,
      title: artifact.title,
      platform: artifact.kind,
      status: artifact.status,
      group: { id: groupId, label: group?.label ?? groupId },
      actions: meta?.actions ?? [],
      reviewNotes: artifact.reviewNotes ?? [],
      prancha: {
        file: artifact.file,
        width: board?.width ?? 0,
        height: board?.height ?? 0,
      },
      steps: artifact.screens.map((label, index) => ({
        index: index + 1,
        label,
        frame: board?.frames?.[index] ?? { x: 0, y: 0, w: 1, h: 1 },
      })),
    }
  })
}

export function loadFlowCatalog() {
  const manifest = readJson(join(GUIDE_DIR, "manifest.json"))
  const taxonomy = readJson(join(here, "taxonomy.json"))
  const frames = readJson(join(here, "frames.json"))
  return {
    taxonomy,
    flows: buildFlows(manifest, taxonomy, frames),
  }
}
