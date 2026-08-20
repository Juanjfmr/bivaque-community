// Iteration budget for the visual loop — Loop 2 (agent escalation). Without a
// ceiling, a driver told to "iterate until clean" can burn hours on one item
// and only ever surface to a human by coincidence. This module tracks how many
// loop iterations a given backlog item has consumed; when the budget is blown,
// the loop stops and writes an escalation report instead of mutating more.
//
// The budget lives at .visual/iteration-state.json (gitignored), keyed by item.
// Pure helpers keep the counting logic unit-testable without the filesystem.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

export const DEFAULT_BUDGET = 3

export function readState(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"))
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function writeState(path, state) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`)
}

// Registers an iteration spent on `item` and reports the outcome. Returns
// { iterations, budget, over } where `over` is true once the spent count
// reaches the budget. `reset` clears the counter (a clean iteration, or the
// item changed identity).
export function consume(state, item, budget = DEFAULT_BUDGET) {
  const entry = state[item] ?? { iterations: 0 }
  const nextIterations = (entry.iterations ?? 0) + 1
  state[item] = { ...entry, iterations: nextIterations }
  return {
    iterations: nextIterations,
    budget,
    over: nextIterations >= budget,
  }
}

export function reset(state, item) {
  if (item in state) delete state[item]
}

// Marks a stable, self-identifying item key so renames don't fork the counter.
export function itemKey(item) {
  return item.trim().toLowerCase()
}
