import { describe, expect, it } from "vitest"
import { isLocalityStale, STALE_LOCALITY_THRESHOLD } from "../../../apps/web/lib/locality-density"

// P0 Task 9: the empty-state on feed, events and guide branches below the §3.4
// density threshold from "Nenhuma publicação ainda" to "Você é dos primeiros aqui."
// This test pins the threshold to the value stated in the plan and the rule in
// BIVAQUE.md §3.4, and pins the helper's behaviour on both sides of the boundary.

describe("locality density threshold", () => {
  it("uses the §3.4 lower bound as the stale threshold", () => {
    expect(STALE_LOCALITY_THRESHOLD).toBe(30)
  })

  it("treats a city with no members as stale", () => {
    expect(isLocalityStale(0)).toBe(true)
  })

  it("treats a city with one member as stale", () => {
    expect(isLocalityStale(1)).toBe(true)
  })

  it("treats a city with 29 members as stale", () => {
    // One below the threshold — the empty state copy must read "Você é dos
    // primeiros aqui."
    expect(isLocalityStale(29)).toBe(true)
  })

  it("treats a city with exactly 30 members as not stale", () => {
    // The threshold itself is the line; the empty state copy must read
    // "Nenhuma publicação ainda" because §3.4 says 30 is the lower bound of
    // "movimento".
    expect(isLocalityStale(30)).toBe(false)
  })

  it("treats a city with 31 members as not stale", () => {
    expect(isLocalityStale(31)).toBe(false)
  })

  it("treats a city with 300 members as not stale", () => {
    // Manaus in the dev seed carries 300 memberships; the helper must not
    // classify it as stale. The empty state copy on Manaus must remain the
    // standard one — and there must be no Manaus-specific branch anywhere
    // (ADR-20260816-national-localities decision 7).
    expect(isLocalityStale(300)).toBe(false)
  })

  it("treats a null count as not stale until the count arrives", () => {
    // The page renders the standard empty state until the count resolves; once
    // it does, it rerenders into the honest one if the locality is below the
    // threshold. Calling isLocalityStale(null) before the fetch returns must
    // therefore return false, so the page does not flash into the upset
    // copy on every load.
    expect(isLocalityStale(null)).toBe(false)
  })
})
