import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")

test("uses the Supabase CLI 2.107 mail testing table", () => {
  // Given the local Supabase config parsed by the pinned CLI
  const config = readFileSync(join(root, "supabase/config.toml"), "utf8")

  // When mail testing table names are inspected
  const usesInbucket = /^\[inbucket\]$/m.test(config)
  const usesLocalSmtp = /^\[local_smtp\]$/m.test(config)

  // Then the config uses the table accepted by Supabase CLI 2.107.0
  assert.equal(usesInbucket, true)
  assert.equal(usesLocalSmtp, false)
})
