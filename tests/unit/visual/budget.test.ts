import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  consume,
  DEFAULT_BUDGET,
  itemKey,
  readState,
  reset,
  writeState,
} from "../../../scripts/visual/budget"

// Loop 2 (agent escalation): the visual loop must stop burning hours on one
// backlog item once the iteration budget is spent. These tests pin the counter
// semantics so a future edit can't turn the ceiling into a no-op.

describe("iteration budget", () => {
  it("defaults to 3 iterations per item", () => {
    expect(DEFAULT_BUDGET).toBe(3)
  })

  it("counts up and reports over only at the budget", () => {
    const state = {}
    expect(consume(state, "item-a")).toEqual({ iterations: 1, budget: 3, over: false })
    expect(consume(state, "item-a")).toEqual({ iterations: 2, budget: 3, over: false })
    expect(consume(state, "item-a")).toEqual({ iterations: 3, budget: 3, over: true })
  })

  it("zeroes an unused item and co-exists across items", () => {
    const state = {}
    consume(state, "item-a")
    expect(consume(state, "item-b")).toEqual({ iterations: 1, budget: 3, over: false })
    expect(state["item-b"]).toEqual({ iterations: 1 })
  })

  it("resets a clean iteration so a fixed item starts fresh next time", () => {
    const state = {}
    consume(state, "item-a")
    consume(state, "item-a")
    reset(state, "item-a")
    expect(state["item-a"]).toBeUndefined()
    expect(consume(state, "item-a")).toEqual({ iterations: 1, budget: 3, over: false })
  })

  it("normalizes item keys so renames don't fork the counter", () => {
    expect(itemKey("  FIX nav  ")).toBe("fix nav")
  })

  it("reads a missing state file as empty and persists round-trip", () => {
    const dir = join(tmpdir(), `bivaque-budget-test-${Date.now()}`)
    const path = join(dir, "iteration-state.json")
    expect(readState(path)).toEqual({})
    expect(readState(join(dir, "missing.json"))).toEqual({})

    const state = {}
    consume(state, "x")
    writeState(path, state)
    expect(readState(path)).toEqual({ x: { iterations: 1 } })
  })
})
