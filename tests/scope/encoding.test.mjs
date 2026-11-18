import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

// Guarda de codificação: mojibake e BOM não entram na main.
//
// Mojibake é UTF-8 lido como Latin-1: U+00E7 (ç) vira U+00C3 seguido de U+00A7.
// Os padrões são montados por código para este arquivo não conter o que ele caça.
// Prazo para esvaziar a lista: 2026-12-05. Nada entra nela sem motivo e sem
// corrigir o arquivo; um arquivo que deixar de quebrar precisa sair da lista.
const prazo = "2026-12-05"
const tetoDaLista = 24

const extensoes = [".md", ".yml", ".json", ".mjs", ".cjs", ".ts", ".tsx", ".sql"]
const paresMojibake = [
  [0xc3, 0xa7],
  [0xc3, 0xa3],
  [0xc3, 0xa9],
  [0xc3, 0xb3],
  [0xc3, 0xaa],
].map((codigos) => String.fromCharCode(...codigos))
const espacoMojibake = String.fromCharCode(0xc2, 0xa0)
const substituicao = String.fromCharCode(0xfffd)

const bomDeEditor = "BOM (U+FEFF) no começo do arquivo, gravado no Windows; tirar o BOM ao editar"
const mojibakeDeTexto =
  "texto com mojibake (UTF-8 lido como Latin-1); corrigir ao reescrever o arquivo"

// Cada exceção é um arquivo que já estava quebrado antes desta guarda existir.
const excecoes = new Map([
  ["apps/app/lib/dados/conversas.ts", bomDeEditor],
  ["apps/app/src/conversas/contexto.ts", bomDeEditor],
  ["apps/app/src/telas/Conversa.tsx", bomDeEditor],
  ["apps/app/src/telas/Conversas.tsx", bomDeEditor],
  ["apps/app/tests/conversas-dados.test.ts", bomDeEditor],
  ["apps/app/tests/e2e/casca-visual.spec.ts", bomDeEditor],
  ["apps/app/tests/e2e/conversas-ajuda.ts", bomDeEditor],
  ["apps/web/app/api/app/conversas/[id]/mensagens/route.ts", bomDeEditor],
  ["apps/web/app/api/app/conversas/[id]/route.ts", bomDeEditor],
  ["apps/web/app/api/app/conversas/_comum.ts", bomDeEditor],
  ["apps/web/app/api/app/conversas/route.ts", bomDeEditor],
  ["apps/web/app/api/app/voce/localizacao/route.ts", bomDeEditor],
  ["tests/scope/conversas-porta.test.mjs", bomDeEditor],
  ["tests/scope/f02-dados.test.mjs", bomDeEditor],
  ["tests/scope/f02-inicio-real.test.mjs", bomDeEditor],
  ["tests/e2e/f09-conversas-real.spec.ts", bomDeEditor],
  ["scripts/bivaque-html/round70-proof.mjs", bomDeEditor],
  ["docs/historico/superpowers/plans/2026-08-20-onda-g-vitrine.md", bomDeEditor],
  [
    "docs/historico/superpowers/plans/2026-08-05-auditoria-telas.md",
    `histórico: ${mojibakeDeTexto}`,
  ],
  ["docs/agents/tasks/RUN-029.task.yml", `contrato já fechado; ${mojibakeDeTexto}`],
  [
    "docs/agents/prototipo-shadcn/inventario.md",
    "caractere de substituição U+FFFD no texto; corrigir ao reescrever",
  ],
  [
    "tools/backend-kanban/public/board.json",
    "texto de cartões com mojibake e U+FFFD; o quadro não se edita à mão — corrigir o cartão que reescrever a descrição",
  ],
])

function arquivosDeTexto() {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\0")
    .filter(Boolean)
    .filter((arquivo) => extensoes.some((extensao) => arquivo.endsWith(extensao)))
}

// A varredura lê todos os arquivos rastreados: roda uma vez por processo.
let varredura
function problemasDeCodificacao() {
  if (varredura) return varredura
  const problemas = new Map()
  for (const arquivo of arquivosDeTexto()) {
    const bytes = readFileSync(join(process.cwd(), arquivo))
    const texto = bytes.toString("utf8")
    const encontrados = []
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) encontrados.push("BOM")
    for (const padrao of paresMojibake) {
      if (texto.includes(padrao)) {
        const codigos = [...padrao].map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase()}`)
        encontrados.push(`mojibake ${codigos.join("+")}`)
      }
    }
    if (texto.includes(espacoMojibake)) encontrados.push("mojibake U+00C2+U+00A0")
    if (texto.includes(substituicao)) encontrados.push("U+FFFD")
    if (encontrados.length > 0) problemas.set(arquivo, encontrados.join(", "))
  }
  varredura = problemas
  return problemas
}

test("nenhum arquivo de texto rastreado tem mojibake ou BOM fora da lista de exceções", () => {
  const foraDaLista = [...problemasDeCodificacao()]
    .filter(([arquivo]) => !excecoes.has(arquivo))
    .map(([arquivo, problema]) => `${arquivo}: ${problema}`)

  assert.deepEqual(
    foraDaLista,
    [],
    `texto quebrado na main; corrija o arquivo (UTF-8 sem BOM, acentuação correta) ou registre o motivo até ${prazo}`,
  )
})

test("a lista de exceções só encolhe e todo arquivo listado ainda quebra", () => {
  const problemas = problemasDeCodificacao()
  const resolvidos = [...excecoes.keys()].filter((arquivo) => !problemas.has(arquivo))

  assert.deepEqual(resolvidos, [], "arquivo já corrigido: remova-o da lista de exceções")
  assert.ok(
    excecoes.size <= tetoDaLista,
    `a lista de exceções cresceu (${excecoes.size} > ${tetoDaLista}): corrija o arquivo novo em vez de listá-lo`,
  )
})

test("toda exceção tem motivo escrito e a lista tem prazo", () => {
  for (const [arquivo, motivo] of excecoes) {
    assert.ok(motivo.trim().length >= 10, `exceção sem motivo: ${arquivo}`)
  }
  assert.match(prazo, /^\d{4}-\d{2}-\d{2}$/)
})
