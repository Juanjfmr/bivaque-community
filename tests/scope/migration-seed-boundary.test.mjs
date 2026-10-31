import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("the retired demo-data migration keeps its version without executable SQL", () => {
  const migration = readFileSync(
    "supabase/migrations/20260901124400_member_suspended_seed.sql",
    "utf8",
  )
  assert.equal(migration.replace(/--[^\n]*/g, "").trim(), "")
})
