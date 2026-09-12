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
  const journeys = readJson(join(here, "journeys.json"))
  return {
    taxonomy,
    frames,
    flows: buildFlows(manifest, taxonomy, frames),
    journeys: buildJourneys(manifest, taxonomy, frames, journeys),
  }
}

// Uma jornada e uma sequencia ordenada de telas com inicio, meio e fim. Cada passo cita uma tela
// por '<prancha>#<indice>'; aqui ele vira um recorte concreto (frame + aspect) e uma fase. A
// prancha e a fonte da tela, nao a jornada — a mesma tela pode servir a jornadas diferentes.
export function buildJourneys(manifest, taxonomy, frames, journeysDoc) {
  const artifacts = new Map(manifest.artifacts.map((a) => [a.id, a]))
  const groupLabel = new Map(taxonomy.groups.map((g) => [g.id, g.label]))

  const resolve = (ref) => {
    const [pranchaId, indexRaw] = ref.split("#")
    const index = Number(indexRaw)
    const artifact = artifacts.get(pranchaId)
    if (!artifact) throw new Error(`jornada cita prancha inexistente: ${pranchaId}`)
    const tela = artifact.screens[index]
    if (tela === undefined) throw new Error(`jornada cita tela inexistente: ${ref}`)
    const board = frames.boards[pranchaId]
    const frame = board?.frames?.[index]
    if (!frame) throw new Error(`sem geometria para ${ref}`)
    const aspect = Number(((frame.w * board.width) / (frame.h * board.height)).toFixed(4))
    return { ref, prancha: pranchaId, tela, arquivo: board.file, frame, aspect }
  }

  return journeysDoc.journeys.map((journey) => {
    const total = journey.etapas.reduce((n, etapa) => n + etapa.passos.length, 0)
    let atendidos = 0
    const etapas = journey.etapas.map((etapa) => ({
      nome: etapa.nome,
      passos: etapa.passos.map((passo) => {
        atendidos += 1
        return {
          ...resolve(passo.tela),
          acao: passo.acao ?? "",
          etapa: etapa.nome,
          posicao: atendidos,
          fase: atendidos === 1 ? "início" : atendidos === total ? "fim" : "meio",
        }
      }),
    }))

    return {
      id: journey.id,
      titulo: journey.titulo,
      plataforma: journey.plataforma,
      grupo: { id: journey.grupo, label: groupLabel.get(journey.grupo) ?? journey.grupo },
      persona: journey.persona,
      comeca: journey.comeca,
      termina: journey.termina,
      acoes: journey.acoes,
      etapas,
      passos: etapas.flatMap((etapa) => etapa.passos),
      // Desvio pode ser um estado sem tela própria (texto) ou um ramo com tela. O primeiro é
      // editorialmente legítimo: "conversa bloqueada" ou "transferência expirada" são estados da
      // jornada, não telas do board, e forçá-los a virar tela inventaria imagem que ninguém desenhou.
      desvios: (journey.desvios ?? []).map((desvio) =>
        typeof desvio === "string"
          ? { texto: desvio }
          : { ...resolve(desvio.tela), quando: desvio.quando, apos: desvio.apos },
      ),
    }
  })
}
