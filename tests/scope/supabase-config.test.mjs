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

test("the Data API never exposes the private schema", () => {
  // Given the local Supabase config
  const config = readFileSync(join(root, "supabase", "config.toml"), "utf8")

  // When the schemas PostgREST is allowed to resolve are read
  const match = /^\s*schemas\s*=\s*\[(.*?)\]/m.exec(config)
  assert.ok(match, "supabase/config.toml precisa declarar api.schemas")

  const exposed = (match[1].match(/"[^"]+"/g) ?? []).map((entry) => entry.replaceAll('"', ""))

  // Then private is not among them.
  //
  // This is load-bearing, not cosmetic: several helpers that RLS policies
  // evaluate live in private and are executable by authenticated (the policy
  // role), because PostgreSQL checks EXECUTE at evaluation time. They are only
  // safe while the Data API cannot name them — the leak measured on 10/09
  // (GET /rest/v1/profiles?select=user_id,is_suspended) was reachable precisely
  // because the sensitive read sat in an exposed schema.
  assert.deepEqual(exposed, ["public", "graphql_public"])
})
