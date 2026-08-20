import { describe, expect, it } from "vitest"

// Onda F Task 7 — guard the server-side rule + UI explanation.
// The CHECK constraint is the single source of truth (Step 1); the UI
// explanation prevents users from triggering 23514 in the first place
// (Step 2). Either path must not regress.

import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..", "..", "..")
const migration = join(
  root,
  "supabase",
  "migrations",
  "20260821000013_recommendation_health_needs_group.sql",
)
const pagePath = join(root, "apps", "web", "app", "(shell)", "recommendations", "page.tsx")

describe("recommendation health scope (F7)", () => {
  it("the migration adds the constraint with the correct expression", () => {
    const source = readFileSync(migration, "utf8")
    expect(source).toContain("recommendation_health_needs_group")
    expect(source).toContain("category <>")
    expect(source).toContain("saude_bem_estar")
    expect(source).toContain("group_id is not null")
  })

  it("the page UI explains the health scope before submit", () => {
    const source = readFileSync(pagePath, "utf8")
    // The explanation appears when the category is saude_bem_estar
    // and the locality option is hidden in the same condition.
    expect(source).toContain("saude_bem_estar")
    expect(source).toMatch(/Pedidos.*Saúde.*grupo/)
    // The locality option is conditionally hidden (ternary with saude_bem_estar)
    // The locality option is hidden when category is saude_bem_estar
    expect(source).toContain('requestCategory !== "saude_bem_estar"')
  })
})
