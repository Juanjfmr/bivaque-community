// Verificação do mapeamento de jornadas + geração do índice.
//
// Confere o que a galeria afirma contra as fontes: um fluxo por prancha, um passo por tela, o
// recorte dentro dos limites, o PNG existindo com as dimensões que a geometria declara, e o HTML
// gerado carregando exatamente os mesmos fluxos. Gera docs/journeys/FLOWS.md.
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

function htmlFlowIds() {
  if (!existsSync(HTML)) return null
  const html = readFileSync(HTML, "utf8")
  const match = html.match(/<script id="dataset" type="application\/json">([\s\S]*?)<\/script>/)
  if (!match) return null
  const data = JSON.parse(match[1])
  return data.flows.map((flow) => flow.id)
}

function verify(flows) {
  const problems = []
  const seen = new Set()

  for (const flow of flows) {
    if (seen.has(flow.id)) problems.push(`${flow.id}: fluxo duplicado`)
    seen.add(flow.id)

    const png = join(GUIDE_DIR, flow.prancha.file)
    if (!existsSync(png)) {
      problems.push(`${flow.id}: PNG ausente (${flow.prancha.file})`)
    } else {
      const size = pngSize(flow.prancha.file)
      if (size.width !== flow.prancha.width || size.height !== flow.prancha.height) {
        problems.push(
          `${flow.id}: dimensão do PNG ${size.width}x${size.height} != geometria ${flow.prancha.width}x${flow.prancha.height}`,
        )
      }
    }

    flow.steps.forEach((step) => {
      const { x, w } = step.frame
      if (x < 0 || w <= 0 || x + w > 1.0001) {
        problems.push(`${flow.id} passo ${step.index}: recorte fora dos limites`)
      }
      if (!step.label?.trim()) problems.push(`${flow.id} passo ${step.index}: sem rótulo`)
    })

    if (!flow.actions.length) problems.push(`${flow.id}: sem tags`)
  }

  const ids = htmlFlowIds()
  if (ids === null) {
    problems.push("flows.html ausente ou sem dataset embutido")
  } else {
    const missing = flows.filter((flow) => !ids.includes(flow.id)).map((flow) => flow.id)
    const extra = ids.filter((id) => !flows.some((flow) => flow.id === id))
    if (missing.length) problems.push(`flows.html não mostra: ${missing.join(", ")}`)
    if (extra.length) problems.push(`flows.html mostra fluxo inexistente: ${extra.join(", ")}`)
  }

  return problems
}

// O índice é determinístico de propósito: sem data nem revisão embutidas, senão o --check
// ficaria vermelho a cada dia e a cada commit.
function buildIndex(flows) {
  const groups = new Map()
  for (const flow of flows) {
    if (!groups.has(flow.group.id))
      groups.set(flow.group.id, { label: flow.group.label, flows: [] })
    groups.get(flow.group.id).flows.push(flow)
  }
  const ordered = [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))

  const lines = []
  lines.push("# Jornadas do Bivaque — índice dos fluxos")
  lines.push("")
  lines.push(
    "> **Gerado** por `scripts/visual/flows-verify.mjs` a partir do guia visual. Não editar à mão.",
  )
  lines.push(
    `> ${flows.length} fluxos derivados das pranchas. É mapa de **referência de aparência e fluxo**, não prova de implementação.`,
  )
  lines.push("> Galeria: [flows.html](../design/visual-guide-2026-09-06/flows.html).")
  lines.push("")

  for (const group of ordered) {
    lines.push(`## ${group.label} (${group.flows.length})`)
    lines.push("")
    lines.push("| Fluxo | Plataforma | Telas/estados | Tags |")
    lines.push("|---|---|---|---|")
    for (const flow of group.flows.sort((a, b) => a.id.localeCompare(b.id))) {
      const file = `../design/visual-guide-2026-09-06/flows.html#${flow.id}`
      lines.push(
        `| [${flow.title}](${file}) | ${PLATFORM_LABEL[flow.platform] ?? flow.platform} | ${flow.steps.length} | ${flow.actions.join(" · ")} |`,
      )
    }
    lines.push("")
  }

  return lines.join("\n")
}

const { flows } = loadFlowCatalog()
const problems = verify(flows)

if (problems.length) {
  console.error("Verificação falhou:")
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}
console.log(
  `verificação ok: ${flows.length} fluxos, ${flows.reduce((n, f) => n + f.steps.length, 0)} passos`,
)

const index = buildIndex(flows)
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
