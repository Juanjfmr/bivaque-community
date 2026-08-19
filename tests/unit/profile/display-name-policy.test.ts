import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Onda E Task 7 Step 5 — guard that the display name CHECK constraint
// (added in migration 20260821000004) is still in place. The constraint
// is the enforcement of D23 (NFC + no bidi/control chars); without it a
// name like "John\u202Ehidden" would render reversed text. If a future
// refactor drops the constraint, this test fails the build.

const root = join(import.meta.dirname, "..", "..", "..")
const migrationsDir = join(root, "supabase", "migrations")

function readMigrations(): { name: string; content: string }[] {
  // Lazy: the vitest runner is invoked at the repo root, so we walk the
  // migrations directory and pick up any .sql file.
  const { readdirSync } = require("node:fs") as typeof import("node:fs")
  return readdirSync(migrationsDir)
    .filter((entry) => entry.endsWith(".sql"))
    .map((name) => ({
      name,
      content: readFileSync(join(migrationsDir, name), "utf8"),
    }))
}

describe("display name policy (E7 Step 5, D23)", () => {
  it("the profiles table is bound by a display_name CHECK constraint that calls private.display_name_ok", () => {
    // Given all migrations
    const migrations = readMigrations()

    // When we look for the add-constraint statement that wires the
    // profiles.display_name to the validation function. The function is named
    // display_name_ok (introduced by P0 Task 5, migration
    // 20260817040043_display_name_policy.sql) and reused by E7 Step 5.
    const wires = migrations.filter(
      ({ content }) =>
        content.includes("add constraint profiles_display_name_check") &&
        content.includes("private.display_name_ok"),
    )

    // Then exactly one migration introduces the constraint
    expect(wires.length).toBeGreaterThanOrEqual(1)
  })

  it("the validation function rejects bidi control chars and C0/C1 control chars", () => {
    // Given the migration that defines the validation function
    const migrations = readMigrations()
    const def = migrations.find(({ content }) =>
      content.includes("create or replace function private.display_name_ok"),
    )
    expect(def).toBeDefined()
    const source = def ? def.content : ""

    // When we look for the rejection clauses — bidi marks AND the C0/C1
    // control class
    // Then both must be present (the function rejects either)
    expect(source).toMatch(/chr\(823[4-9]\)/) // bidi: U+202A-202E range
    expect(source).toMatch(/\[\[:cntrl:\]\]/) // C0/C1 control class
  })
})
