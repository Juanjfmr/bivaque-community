import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

// P0 Task 2: admission_mode stops encoding rollout as eligibility.
//
// ADR-20260816-national-localities decision 3: access cannot depend on the
// locality being in a priority rollout. The column survives — invite_only
// and waitlist_only remain legitimate exceptions for a specific locality —
// but they stop being the default, and no catalog row may sit in
// waitlist_only. Whoever wants an exception breaks this test and justifies.

const root = join(import.meta.dirname, "..", "..")
const MIGRATIONS = join(root, "supabase", "migrations")

const files = readdirSync(MIGRATIONS)
  .filter((name) => name.endsWith(".sql"))
  .sort()

const dataMigration = files.find((name) => name.includes("locality_catalog_data"))
const defaultMigration = files.find((name) => name.includes("admission_mode_verification_default"))

test("the catalog data migration exists for the scope check to read", () => {
  assert.ok(dataMigration, "locality_catalog_data migration not found")
})

test("the admission_mode default is set to verification_gated after the catalog load", () => {
  // Given the migration that flips the default
  assert.ok(defaultMigration, "admission_mode_verification_default migration not found")

  // When both are read
  const dataSql = readFileSync(join(MIGRATIONS, dataMigration), "utf8")
  const defaultSql = readFileSync(join(MIGRATIONS, defaultMigration), "utf8")

  // Then the flip lands after the catalog rows were inserted
  assert.ok(
    defaultMigration > dataMigration,
    "the default change must come after the catalog load so no row is left waitlist_only",
  )
  assert.match(
    defaultSql,
    /alter table public\.localities\s+alter column admission_mode set default 'verification_gated'/,
    "the schema default must be verification_gated",
  )
})

test("no catalog locality is born waitlist_only", () => {
  // Given the generated catalog load
  const dataSql = readFileSync(join(MIGRATIONS, dataMigration), "utf8")

  // Then no inserted locality row carries the old default explicitly
  assert.doesNotMatch(dataSql, /'waitlist_only'/, "catalog rows must not be waitlist_only")
})
