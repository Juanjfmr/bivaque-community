import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Onda E Task 4 Step 3 — guard for the audience-selector privacy bug.
//
// The composer resetForm used to call setCommunityId(null), which made the
// SECOND post in a session publish to city-wide reach by default — exactly
// the leak-by-inattention the plan §Task 4 step 3 calls out ("isso é bug de
// privacidade, não de UX"). The fix is to keep defaultCommunityId (the vila
// the inviter was on). This test fails the build if a future refactor
// re-introduces the null reset.

const root = join(import.meta.dirname, "..", "..", "..")
const composerPath = join(root, "apps", "web", "app", "components", "bivaque", "feed-post.tsx")

describe("audience selector keeps the vila on reset (E4 Step 3)", () => {
  it("resetForm does not zero the communityId back to null", () => {
    // Given the source of the composer
    const source = readFileSync(composerPath, "utf8")

    // When we isolate the body of resetForm (between the opening and the
    // closing brace that matches the useCallback indentation)
    const match = source.match(
      /const resetForm = useCallback\(\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\n {2}\},/,
    )
    expect(match).not.toBeNull()
    const body = match ? match[1] : ""

    // Then setCommunityId(null) must NOT appear — that was the privacy bug.
    expect(body).not.toMatch(/setCommunityId\(\s*null\s*\)/)
  })

  it("resetForm falls back to defaultCommunityId", () => {
    // Given the resetForm body
    const source = readFileSync(composerPath, "utf8")
    const match = source.match(
      /const resetForm = useCallback\(\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\n {2}\},/,
    )
    expect(match).not.toBeNull()
    const body = match ? match[1] : ""

    // Then the communityId line must reference defaultCommunityId, so the
    // second post in a session stays on the same vila unless the user
    // explicitly switches audience.
    expect(body).toMatch(/setCommunityId\(\s*defaultCommunityId\b/)
  })
})
