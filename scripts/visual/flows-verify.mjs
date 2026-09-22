// Verificação do mapeamento de jornadas + geração do índice.
//
// Confere o que a galeria afirma contra as fontes: toda tela citada por uma jornada existe e tem
// recorte, toda tela das pranchas é alcançada por alguma jornada, os PNGs existem com as dimensões
// que a geometria declara, e o HTML gerado carrega exatamente os mesmos itens. Gera FLOWS.md.
//
// Uso:
//   node scripts/visual/flows-verify.mjs          verifica e escreve FLOWS.md
//   node scripts/visual/flows-verify.mjs --check   não escreve; falha se houver problema ou índice velho

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { GUIDE_DIR, loadFlowCatalog } from "./flows/catalog.mjs"

const here = fileURLToPath(new URL(".", import.meta.url))
const repoRoot = join(here, "..", "..")
const OUT_MD = join(repoRoot, "docs", "journeys", "FLOWS.md")
const HTML = join(GUIDE_DIR, "flows.html")
const CHECK = process.argv.includes("--check")

const PLATFORM_LABEL = { mobile: "Mobile", web: "Desktop web" }

function pngSize(file) {
  const buffer = readFileSync(join(GUIDE_DIR, file))
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

function htmlDataset() {
  if (!existsSync(HTML)) return null
  const html = readFileSync(HTML, "utf8")
  const match = html.match(/<script id="dataset" type="application\/json">([\s\S]*?)<\/script>/)
  return match ? JSON.parse(match[1]) : null
}

function verify(catalog) {
  const problems = []
  const { flows, journeys, frames } = catalog

  for (const flow of flows) {
    const png = join(GUIDE_DIR, flow.prancha.file)
    if (!existsSync(png)) {
      problems.push(`${flow.id}: PNG ausente (${flow.prancha.file})`)
    } else {
      const size = pngSize(flow.prancha.file)
      if (size.width !== flow.prancha.width || size.height !== flow.prancha.height) {
        problems.push(`${flow.id}: dimensão do PNG ${size.width}x${size.height} != geometria`)
      }
    }
    flow.steps.forEach((step) => {
      const { x, w } = step.frame
      if (x < 0 || w <= 0 || x + w > 1.0001) {
        problems.push(`${flow.id} passo ${step.index}: recorte fora dos limites`)
      }
    })
  }

  const journeyIds = new Set()
  for (const journey of journeys) {
    if (journeyIds.has(journey.id)) problems.push(`${journey.id}: jornada duplicada`)
    journeyIds.add(journey.id)
    if (journey.acoes.length === 0) problems.push(`${journey.id}: sem tags`)
    if (!journey.persona?.trim()) problems.push(`${journey.id}: sem persona`)
    if (journey.etapas.length === 0) problems.push(`${journey.id}: sem etapas`)

    const refs = new Set()
    for (const etapa of journey.etapas) {
      if (!etapa.nome?.trim()) problems.push(`${journey.id}: etapa sem nome`)
      if (etapa.passos.length === 0) problems.push(`${journey.id}/${etapa.nome}: etapa sem passos`)
      for (const passo of etapa.passos) refs.add(passo.ref)
    }

    const first = journey.passos[0]
    const last = journey.passos[journey.passos.length - 1]
    if (first && first.fase !== "início")
      problems.push(`${journey.id}: primeiro passo não é início`)
    if (last && journey.passos.length > 1 && last.fase !== "fim") {
      problems.push(`${journey.id}: último passo não é fim`)
    }

    const semAcao = journey.passos
      .slice(0, -1)
      .filter((passo) => !passo.acao?.trim())
      .map((passo) => passo.posicao)
    if (semAcao.length) {
      problems.push(`${journey.id}: passo sem ação de transição: ${semAcao.join(", ")}`)
    }

    for (const desvio of journey.desvios) {
      // Desvio sem tela própria: só exige texto. Desvio com tela: exige condição e âncora real.
      if (desvio.texto !== undefined) {
        if (!String(desvio.texto).trim()) problems.push(`${journey.id}: desvio de texto vazio`)
        continue
      }
      if (!desvio.quando?.trim()) problems.push(`${journey.id}: desvio sem "quando"`)
      if (!refs.has(desvio.apos)) {
        problems.push(`${journey.id}: desvio de ${desvio.ref} aponta para passo inexistente`)
      }
    }

    for (const step of [...journey.passos, ...journey.desvios]) {
      if (step.texto !== undefined) continue
      const { x, w } = step.frame
      if (x < 0 || w <= 0 || x + w > 1.0001) {
        problems.push(`${journey.id} ${step.ref}: recorte fora dos limites`)
      }
    }
  }

  const used = new Set()
  for (const journey of journeys) {
    for (const step of [...journey.passos, ...journey.desvios]) used.add(step.ref)
  }
  const orphan = []
  for (const [id, board] of Object.entries(frames.boards)) {
    for (let i = 0; i < board.expected; i++) {
      const ref = `${id}#${i}`
      if (!used.has(ref)) orphan.push(ref)
    }
  }
  if (orphan.length) problems.push(`telas fora de qualquer jornada: ${orphan.join(", ")}`)

  const data = htmlDataset()
  if (!data) {
    problems.push("flows.html ausente ou sem dataset embutido")
  } else {
    const missing = journeys
      .filter((j) => !data.jornadas.some((d) => d.id === j.id))
      .map((j) => j.id)
    if (missing.length) problems.push(`flows.html não mostra a jornada: ${missing.join(", ")}`)
    const missingFlow = flows
      .filter((f) => !data.pranchas.some((d) => d.id === f.id))
      .map((f) => f.id)
    if (missingFlow.length)
      problems.push(`flows.html não mostra a prancha: ${missingFlow.join(", ")}`)
  }

  return problems
}

function groupBy(items) {
  const map = new Map()
  for (const item of items) {
    const group = item.grupo ?? item.group
    if (!map.has(group.id)) map.set(group.id, { label: group.label, items: [] })
    map.get(group.id).items.push(item)
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))
}

function buildIndex(catalog) {
  const { journeys, flows } = catalog
  const lines = []
  lines.push("# Jornadas e fluxos do Bivaque")
  lines.push("")
  lines.push(
    "> **Gerado** por `scripts/visual/flows-verify.mjs` a partir do guia visual. Não editar à mão.",
  )
  lines.push(
    "> Jornada é uma sequência de telas com início, meio e fim, no molde do Mobbin; a tela vem da prancha.",
  )
  lines.push(
    `> ${journeys.length} jornadas e ${flows.length} pranchas. É mapa de **referência**, não prova de implementação.`,
  )
  lines.push("> Galeria: [flows.html](../design/visual-guide-2026-09-06/flows.html).")
  lines.push("")
  lines.push("## Jornadas")
  lines.push("")

  for (const group of groupBy(journeys)) {
    lines.push(`### ${group.label} (${group.items.length})`)
    lines.push("")
    lines.push("| Jornada | Plataforma | Etapas | Telas | Começa → termina |")
    lines.push("|---|---|---|---|---|")
    for (const journey of group.items.sort((a, b) => a.id.localeCompare(b.id))) {
      const file = `../design/visual-guide-2026-09-06/flows.html#${journey.id}`
      const etapas = journey.etapas.map((etapa) => etapa.nome).join(" → ")
      lines.push(
        `| [${journey.titulo}](${file}) | ${PLATFORM_LABEL[journey.plataforma]} | ${etapas} | ${journey.passos.length} | ${journey.comeca} → ${journey.termina} |`,
      )
    }
    lines.push("")
  }

  lines.push("## Pranchas")
  lines.push("")
  for (const group of groupBy(flows)) {
    lines.push(`### ${group.label} (${group.items.length})`)
    lines.push("")
    lines.push("| Prancha | Plataforma | Telas |")
    lines.push("|---|---|---|")
    for (const flow of group.items.sort((a, b) => a.id.localeCompare(b.id))) {
      const file = `../design/visual-guide-2026-09-06/flows.html#${flow.id}`
      lines.push(
        `| [${flow.title}](${file}) | ${PLATFORM_LABEL[flow.platform]} | ${flow.steps.length} |`,
      )
    }
    lines.push("")
  }

  return lines.join("\n")
}

const catalog = loadFlowCatalog()
const problems = verify(catalog)

if (problems.length) {
  console.error("Verificação falhou:")
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}
console.log(
  `verificação ok: ${catalog.journeys.length} jornadas, ${catalog.flows.length} pranchas, ${catalog.journeys.reduce((n, j) => n + j.passos.length, 0)} passos`,
)

const index = buildIndex(catalog)
if (CHECK) {
  const current = existsSync(OUT_MD) ? readFileSync(OUT_MD, "utf8") : ""
  if (current !== index) {
    console.error("FLOWS.md está desatualizado — rode node scripts/visual/flows-verify.mjs")
    process.exit(1)
  }
  console.log("--check ok: FLOWS.md em dia")
} else {
  writeFileSync(OUT_MD, index, "utf8")
  console.log(`escrito ${OUT_MD}`)
}
