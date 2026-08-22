import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
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

function argumentValue(flag) {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"))
  process.exitCode = 1
} else {
  const summary = renderBoardSummary(board)
  const cardId = argumentValue("--card")
  const searchQuery = argumentValue("--search")
  if (process.argv.includes("--next")) {
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
