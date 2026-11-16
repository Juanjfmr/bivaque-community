import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { aplicarPatchNoQuadro, relatarAplicacao } from "./board-apply.mjs"
import {
  findCard,
  renderBoardSummary,
  renderNextCard,
  searchCards,
  validateBoard,
} from "./board-lib.mjs"

const sourceDirectory = fileURLToPath(new URL(".", import.meta.url))
const toolDirectory = resolve(sourceDirectory, "..")
const boardPath = resolve(toolDirectory, "public", "board.json")
const summaryPath = resolve(toolDirectory, "BOARD.md")
const board = JSON.parse(readFileSync(boardPath, "utf8"))
const errors = validateBoard(board)

const usage = [
  "Uso: node tools/backend-kanban/src/board.mjs <comando>",
  "",
  "  (sem comando)      imprime o resumo do quadro",
  "  --card <ID>        mostra um cartão inteiro",
  "  --search <termo>   procura cartões",
  "  --next             mostra o próximo cartão autonomamente executável",
  "  --apply <patch>    aplica um patch de escrita: create, update, move, note, checklist",
  "  --dry-run          com --apply: mostra o que mudaria, sem escrever nada",
  "  --write-summary    regenera o BOARD.md",
  "  --check            valida o quadro e a sincronia do BOARD.md",
  "",
  'Patch: {"operations": [{ "op": "move", "id": "CARD-1", "status": "done", "completedAt": "2026-11-16" }]}',
  "Escrita no board.json só por este comando; script avulso para editá-lo é proibido (AGENTS.md).",
  "",
].join("\n")

function argumentValue(flag) {
  const index = process.argv.indexOf(flag)
  const value = index === -1 ? undefined : process.argv[index + 1]
  return value === undefined || value.startsWith("--") ? undefined : value
}

if (process.argv.includes("--help")) {
  process.stdout.write(usage)
} else if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"))
  process.exitCode = 1
} else {
  const summary = renderBoardSummary(board)
  const cardId = argumentValue("--card")
  const searchQuery = argumentValue("--search")
  const patchPath = argumentValue("--apply")
  const dryRun = process.argv.includes("--dry-run")
  if (patchPath) {
    try {
      const resultado = aplicarPatchNoQuadro({ boardPath, summaryPath, patchPath, dryRun })
      process.stdout.write(relatarAplicacao(resultado))
    } catch (error) {
      console.error(`Patch não aplicado: ${error.message}`)
      process.exitCode = 1
    }
  } else if (dryRun) {
    console.error("--dry-run só vale junto de --apply <patch>")
    process.exitCode = 1
  } else if (process.argv.includes("--apply")) {
    console.error("--apply precisa do caminho de um arquivo de patch JSON")
    process.exitCode = 1
  } else if (process.argv.includes("--next")) {
    process.stdout.write(renderNextCard(board))
  } else if (cardId) {
    const card = findCard(board, cardId)
    if (!card) {
      console.error(`Card não encontrado: ${cardId}`)
      process.exitCode = 1
    } else {
      process.stdout.write(`${JSON.stringify(card, null, 2)}\n`)
    }
  } else if (searchQuery) {
    const matches = searchCards(board, searchQuery)
    if (matches.length === 0) {
      console.error(`Nenhum card encontrado para: ${searchQuery}`)
      process.exitCode = 1
    } else {
      process.stdout.write(
        `${matches.map((card) => `${card.id}\t${card.status}\t${card.priority}\t${card.title}`).join("\n")}\n`,
      )
    }
  } else if (process.argv.includes("--write-summary")) {
    writeFileSync(summaryPath, summary, "utf8")
    console.log(`Resumo atualizado: ${summaryPath}`)
  } else if (process.argv.includes("--check")) {
    const currentSummary = readFileSync(summaryPath, "utf8")
    if (currentSummary !== summary) {
      console.error("BOARD.md está desatualizado; execute board.mjs --write-summary")
      process.exitCode = 1
    } else {
      console.log(`Board válido: ${board.cards.length} cards; resumo sincronizado`)
    }
  } else {
    process.stdout.write(summary)
  }
}
