// Integra uma prancha nova ao repositório inteiro, a partir de um spec ao lado da fonte HTML.
//
// Desenhar a prancha é metade do trabalho; a outra metade é a integração, que toca nove lugares:
// manifesto, taxonomia, jornadas, índice do guia, leitura versionada, contrato, escopo, geometria
// e galeria. Feito à mão a cada prancha, isso é onde nasce inconsistência silenciosa — uma prancha
// no manifesto e fora do contrato, ou uma jornada que cita tela sem geometria.
//
// O spec (`src/<id>.board.json`) carrega tudo que é editorial. Este script carrega o resto.
//
// Uso:
//   node scripts/visual/add-board.mjs <board-id>          integra e regenera os derivados
//   node scripts/visual/add-board.mjs <board-id> --check   só confere se já está integrada

import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = fileURLToPath(new URL("../../", import.meta.url))
const GUIDE = join(repoRoot, "docs", "design", "visual-guide-2026-09-06")
const SRC = join(GUIDE, "src")

const id = process.argv.slice(2).find((a) => !a.startsWith("--"))
const CHECK = process.argv.includes("--check")
if (!id) {
  console.error("uso: node scripts/visual/add-board.mjs <board-id> [--check]")
  process.exit(2)
}

const specPath = join(SRC, `${id}.board.json`)
if (!existsSync(specPath)) {
  console.error(`spec ausente: ${specPath.replace(repoRoot, "")}`)
  console.error(
    "o spec carrega o que é editorial: grupo, título, telas, reviewNotes, leitura, contrato e jornada.",
  )
  process.exit(2)
}
const spec = JSON.parse(readFileSync(specPath, "utf8"))

const ler = (p) => readFileSync(p, "utf8")
const gravar = (p, t) => writeFileSync(p, t, "utf8")

const mexer = (relativo, transformar, descricao) => {
  const caminho = join(repoRoot, relativo)
  const antes = ler(caminho)
  const depois = transformar(antes)
  if (depois === antes) return `${descricao}: já estava`
  if (CHECK) return `${descricao}: PENDENTE`
  gravar(caminho, depois)
  return `${descricao}: aplicado`
}

const resultados = []

// ---------------------------------------------------------------- manifesto
resultados.push(
  mexer(
    "docs/design/visual-guide-2026-09-06/manifest.json",
    (t) => {
      if (t.includes(`"id": "${id}"`)) return t
      const entrada = {
        id: spec.id,
        kind: spec.kind,
        group: spec.group,
        title: spec.title,
        screens: spec.screens,
        reviewNotes: spec.reviewNotes,
        source: `docs/design/visual-guide-2026-09-06/src/${id}.html`,
        prompt: spec.prompt,
        file: `${id}.png`,
        path: `docs/design/visual-guide-2026-09-06/${id}.png`,
        status: "Referencia visual",
        reviewedAt: spec.reviewedAt ?? "2026-09-12",
      }
      const bloco = JSON.stringify(entrada, null, 2)
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n")
      return t.replace(/\n {2}\],\n {2}"pending": \[\]/, `,\n${bloco}\n  ],\n  "pending": []`)
    },
    "manifesto",
  ),
)

// ---------------------------------------------------------------- taxonomia
resultados.push(
  mexer(
    "scripts/visual/flows/taxonomy.json",
    (t) => {
      let saida = t
      const tax = JSON.parse(saida)
      const novas = (spec.journey?.acoes ?? []).filter((a) => !tax.actionVocabulary.includes(a))
      if (novas.length) {
        const termos = [...new Set([...tax.actionVocabulary, ...novas])].sort((a, b) =>
          a.localeCompare(b, "pt-BR"),
        )
        const bloco = termos.map((termo) => `    "${termo}"`).join(",\n")
        saida = saida.replace(
          /"actionVocabulary": \[[\s\S]*?\n {2}\]/,
          `"actionVocabulary": [\n${bloco}\n  ]`,
        )
      }
      if (saida.includes(`"${id}": {`)) return saida
      const linha = `    "${id}": { "actions": ${JSON.stringify(spec.journey?.acoes ?? [])} }`
      return saida.replace(/\n {2}\}\n\}\s*$/, `,\n${linha}\n  }\n}\n`)
    },
    "taxonomia",
  ),
)

// ---------------------------------------------------------------- jornada
resultados.push(
  mexer(
    "scripts/visual/flows/journeys.json",
    (t) => {
      if (t.includes(`"id": "${spec.journey.id}"`)) return t
      const j = JSON.stringify(spec.journey, null, 2)
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n")
      return t.replace(/\n {2}\]\n\}\s*$/, `,\n${j}\n  ]\n}\n`)
    },
    "jornada",
  ),
)

// ---------------------------------------------------------------- índice do guia
resultados.push(
  mexer(
    "docs/design/visual-guide-2026-09-06/README.md",
    (t) => {
      if (t.includes(`(${id}.png)`)) return t
      const linha = `| [${id} — ${spec.title}](./${id}.png) | ${spec.kind} | ${spec.screens.join("; ")} |`
      const linhas = t.split("\n")
      let ultimo = -1
      linhas.forEach((l, i) => {
        if (/^\| \[[0-9]+-web-[a-z0-9-]+ — /.test(l)) ultimo = i
      })
      if (ultimo < 0) return t
      linhas.splice(ultimo + 1, 0, linha)
      return linhas.join("\n")
    },
    "índice do guia",
  ),
)

// ---------------------------------------------------------------- leitura versionada
resultados.push(
  mexer(
    "docs/agents/PRANCHAS-WEB-RESTANTES.md",
    (t) => {
      if (t.includes(`## ${id} `)) return t
      return `${t.replace(/\s*$/, "")}\n\n${spec.leitura.replace(/\s*$/, "")}\n`
    },
    "leitura versionada",
  ),
)

// ---------------------------------------------------------------- contrato
resultados.push(
  mexer(
    `docs/agents/tasks/${spec.contract}.task.yml`,
    (t) => {
      if (t.includes(`${id}.png`)) return t
      const linhas = [
        `  - docs/design/visual-guide-2026-09-06/${id}.png`,
        `  - docs/agents/PRANCHAS-WEB-RESTANTES.md secao ${id}`,
      ].join("\n")
      return t.replace(/^authority:\n/m, `authority:\n${linhas}\n`)
    },
    `contrato ${spec.contract}`,
  ),
)

// ---------------------------------------------------------------- cobertura de escopo
resultados.push(
  mexer(
    "tests/scope/prancha-coverage.test.mjs",
    (t) => {
      let saida = t
      if (!saida.includes(`"${id}"`)) {
        saida = saida.replace(/(\n {4}"\d+-web-[a-z0-9-]+",)(\n {2}\])/, `$1\n    "${id}",$2`)
      }
      const m = saida.match(/assert\.equal\(readWebBoards\(\)\.length, (\d+)\)/)
      const atual = Number(m[1])
      const esperado = Number(
        ler(join(GUIDE, "manifest.json"))
          .match(/"file": "\d+-web-[a-z0-9-]+\.png"/g)
          .length.toString(),
      )
      if (atual !== esperado) {
        saida = saida.replace(
          `assert.equal(readWebBoards().length, ${atual})`,
          `assert.equal(readWebBoards().length, ${esperado})`,
        )
        saida = saida.replace(
          /test\("o manifesto continua descrevendo as \d+ pranchas web"/,
          `test("o manifesto continua descrevendo as ${esperado} pranchas web"`,
        )
      }
      return saida
    },
    "cobertura de escopo",
  ),
)

// ---------------------------------------------------------------- derivados
//
// A ordem importa: a verificação exige o PNG, então a prancha é renderizada antes. Renderizar
// também valida o desenho — se o navegador aplicar escala, o render se recusa e a integração
// inteira para, em vez de gravar uma prancha defeituosa no repositório.
const roda = (rotulo, args) => {
  if (CHECK) return
  try {
    execFileSync(process.execPath, args, { cwd: repoRoot, stdio: "pipe" })
    resultados.push(`${rotulo}: regenerado`)
  } catch (erro) {
    console.error(`\n${rotulo} falhou:`)
    console.error(String(erro.stdout ?? "").trim() || String(erro.stderr ?? "").trim())
    process.exit(1)
  }
}

if (!CHECK) {
  roda("render", ["scripts/visual/render-board.mjs", id])
  roda("geometria", ["scripts/visual/flows/detect-frames.mjs"])
  roda("galeria", ["scripts/visual/flows-gallery.mjs"])
  roda("verificação", ["scripts/visual/flows-verify.mjs"])
}

for (const r of resultados) console.log(`  ${r}`)
if (CHECK) {
  const pendentes = resultados.filter((r) => r.includes("PENDENTE"))
  if (pendentes.length) {
    console.error(
      `\n${id} não está integrada em: ${pendentes.map((p) => p.split(":")[0]).join(", ")}`,
    )
    process.exit(1)
  }
  console.log(`\n${id} está integrada`)
} else {
  console.log(`\n${id} integrada. Rode node scripts/visual/render-board.mjs ${id}`)
}
