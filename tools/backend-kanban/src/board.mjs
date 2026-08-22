import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { renderBoardSummary, validateBoard } from "./board-lib.mjs"

const sourceDirectory = fileURLToPath(new URL(".", import.meta.url))
const toolDirectory = resolve(sourceDirectory, "..")
const boardPath = resolve(toolDirectory, "public", "board.json")
const summaryPath = resolve(toolDirectory, "BOARD.md")
const board = JSON.parse(readFileSync(boardPath, "utf8"))
const errors = validateBoard(board)

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"))
  process.exitCode = 1
} else {
  const summary = renderBoardSummary(board)
  if (process.argv.includes("--write-summary")) {
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
