import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import {
  renderBoardSummary,
  renderNextCard,
  selectNextCard,
  validateBoard,
} from "../../tools/backend-kanban/src/board-lib.mjs"

const root = process.cwd()
const boardPath = join(root, "tools", "backend-kanban", "public", "board.json")
const summaryPath = join(root, "tools", "backend-kanban", "BOARD.md")
const agentsPath = join(root, "AGENTS.md")
const cliPath = join(root, "tools", "backend-kanban", "src", "board.mjs")
const board = JSON.parse(readFileSync(boardPath, "utf8"))

test("backend Kanban has valid canonical data", () => {
  assert.deepEqual(validateBoard(board), [])
})

test("backend Kanban rejects missing source metadata and dependencies", () => {
  const invalid = structuredClone(board)
  delete invalid.cards[0].updatedAt
  delete invalid.cards[1].sourceRevision
  delete invalid.cards[2].dependencies
  invalid.cards[3].proof = []
  invalid.cards[3].links = []
  invalid.cards[4].status = "done"
  invalid.cards[4].completedAt = "2026-08-22"
  invalid.cards[4].drift = {
    documented: "texto antigo",
    observed: "runtime novo",
    action: "resolver",
  }
  const errors = validateBoard(invalid).join("\n")
  assert.match(errors, /updatedAt é obrigatório/)
  assert.match(errors, /sourceRevision é obrigatório/)
  assert.match(errors, /dependencies deve ser um array/)
  assert.match(errors, /proof ou links como evidência de origem/)
  assert.match(errors, /card done não pode manter drift aberto/)
})

// Card `done` com dependência ainda executável contradiz o modelo: selectNextCard
// só libera um card quando todas as dependências estão `done`. A checagem de
// dependência conferia apenas que a aresta existe, não o estado de quem ela
// aponta — foi assim que G-TASK-6 ficou `done` com G-TASK-3 em `next` no PR #37
// e a CI passou verde. Achado por revisão, não por teste.
test("backend Kanban rejects a done card whose dependency still has work", () => {
  // Given a done card that depends on a card in each executable state
  for (const status of ["now", "next", "repo"]) {
    const invalid = structuredClone(board)
    const [blocker, closed] = [invalid.cards[0], invalid.cards[1]]
    blocker.status = status
    closed.status = "done"
    closed.completedAt = "2026-08-28"
    closed.dependencies = [blocker.id]
    delete closed.drift

    // When the board is validated
    const errors = validateBoard(invalid).join("\n")

    // Then the closure is refused, naming both cards and the open state
    assert.match(
      errors,
      new RegExp(`${closed.id}: card done depende de ${blocker.id}, que está '${status}'`),
      `dependência em '${status}' deveria bloquear o fechamento`,
    )
  }
})

test("backend Kanban accepts a done card blocked only on a human decision", () => {
  // Given a done card depending on one held by a human blocker, not by work —
  // MVP-01-ADMISSION e MVP-03-COMMUNITY são exatamente isso contra BLOCK-RESEND
  for (const status of ["blocked", "frozen"]) {
    const valid = structuredClone(board)
    const [blocker, closed] = [valid.cards[0], valid.cards[1]]
    blocker.status = status
    blocker.blockers = ["Decisão do dono"]
    closed.status = "done"
    closed.completedAt = "2026-08-28"
    closed.dependencies = [blocker.id]
    delete closed.drift

    // When the board is validated
    const errors = validateBoard(valid).join("\n")

    // Then nothing complains: "feito, com a entrega travada num humano" é legítimo
    assert.doesNotMatch(
      errors,
      /card done depende de/,
      `dependência em '${status}' é espera por humano, não trabalho pendente`,
    )
  }
})

test("backend Kanban resolves one card or searches without loading the full board", () => {
  const card = JSON.parse(
    execFileSync(process.execPath, [cliPath, "--card", "MVP-02-AUTHZ"], { encoding: "utf8" }),
  )
  assert.equal(card.id, "MVP-02-AUTHZ")

  const search = execFileSync(process.execPath, [cliPath, "--search", "service_role"], {
    encoding: "utf8",
  })
  assert.match(search, /^MVP-02-AUTHZ\t/m)
})

test("backend Kanban exposes the next autonomous card contract", () => {
  const selected = selectNextCard(board)
  assert.ok(selected)
  assert.notEqual(selected.status, "blocked")
  assert.notEqual(selected.status, "done")
  assert.notEqual(selected.status, "frozen")

  const next = execFileSync(process.execPath, [cliPath, "--next"], { encoding: "utf8" })
  assert.match(next, new RegExp(`^${selected.id}\\t${selected.status}\\t${selected.priority}`, "m"))
  assert.match(next, /drift é evidência temporária, não entrega final/)
  assert.equal(next, renderNextCard(board))
})

test("backend Kanban summary is generated from canonical data", () => {
  assert.equal(readFileSync(summaryPath, "utf8"), renderBoardSummary(board))
})

test("agents read the summary and update only material transitions", () => {
  const agents = readFileSync(agentsPath, "utf8")
  assert.match(agents, /tools\/backend-kanban\/BOARD\.md/)
  assert.match(agents, /board\.mjs --next/)
  assert.match(agents, /board\.mjs --card <ID>/)
  assert.match(agents, /--search <terms>/)
  assert.match(agents, /merely starting work is not a board transition/)
  assert.match(agents, /CI rejects invalid data\s+or a stale summary/)
  assert.match(agents, /Resolve cards; do not stop at drift/)
  assert.match(agents, /A `done`\s+card may not keep open drift/)
})

test("the discovering agent records genuinely new work without inventing scope", () => {
  const agents = readFileSync(agentsPath, "utf8")
  assert.match(agents, /The discovering agent records a genuinely new task/)
  assert.match(agents, /Search existing IDs, titles and\s+checklists first/)
  assert.match(agents, /Git `sourceRevision`/)
  assert.match(agents, /explicit `dependencies`/)
  assert.match(agents, /enters `blocked` or `repo`/)
  assert.match(agents, /discovery is not authority to invent scope/)
})
