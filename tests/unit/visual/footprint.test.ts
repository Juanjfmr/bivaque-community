import { describe, expect, it } from "vitest"
import { parseRow } from "../../../scripts/visual/footprint"

// Loop 4 (data footprint): development tooling must be able to see whether the
// local stack left rows behind. The parsable output is the pure, unit-testable
// seam; the Docker round-trip is exercised when the loop actually runs (it is
// best-effort and must not block CI if the stack is down).

describe("data footprint parse", () => {
  it("parses a populated psql -tA row into counts", () => {
    const counts = parseRow("306|250|668|280|12|410")
    expect(counts).toEqual({
      profiles: 306,
      profiles_with_membership: 250,
      auth_users: 668,
      locality_memberships: 280,
      communities: 12,
      posts: 410,
    })
  })

  it("treats NULL (table absent mid-reset) as null, never NaN", () => {
    const counts = parseRow("0||0||||")
    expect(counts.profiles).toBe(0)
    expect(counts.profiles_with_membership).toBe(null)
    expect(counts.auth_users).toBe(0)
    expect(counts.communities).toBe(null)
    expect(counts.posts).toBe(null)
  })
})
