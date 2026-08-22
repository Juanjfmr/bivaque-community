import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import { renderBoardSummary, validateBoard } from "../../tools/backend-kanban/src/board-lib.mjs"

const root = process.cwd()
const boardPath = join(root, "tools", "backend-kanban", "public", "board.json")
const summaryPath = join(root, "tools", "backend-kanban", "BOARD.md")
const agentsPath = join(root, "AGENTS.md")
const board = JSON.parse(readFileSync(boardPath, "utf8"))

test("backend Kanban has valid canonical data", () => {
  assert.deepEqual(validateBoard(board), [])
})

test("backend Kanban summary is generated from canonical data", () => {
  assert.equal(readFileSync(summaryPath, "utf8"), renderBoardSummary(board))
})

test("agents read the summary and update only material transitions", () => {
  const agents = readFileSync(agentsPath, "utf8")
  assert.match(agents, /tools\/backend-kanban\/BOARD\.md/)
  assert.match(agents, /merely starting work is not a board transition/)
  assert.match(agents, /CI rejects invalid data\s+or a stale summary/)
})

test("the discovering agent records genuinely new work without inventing scope", () => {
  const agents = readFileSync(agentsPath, "utf8")
  assert.match(agents, /The discovering agent records a genuinely new task/)
  assert.match(agents, /Search existing IDs, titles and\s+checklists first/)
  assert.match(agents, /enters `blocked` or `repo`/)
  assert.match(agents, /discovery is not authority to invent scope/)
})
