import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { normalizeGeneratedTypes } from "../../scripts/normalize-generated-types.mjs"

const raw = `      set_community_image: {
        Args: {
          p_caller_user_id: string
          p_community_id: string
          p_kind: string
          p_path: string
        }
        Returns: undefined
      }`

test("normalizes the nullable RPC argument and stays idempotent", () => {
  const normalized = normalizeGeneratedTypes(`${raw}\n\n`)
  assert.match(normalized, /p_path: string \| null/)
  assert.match(normalized, /[^\n]\n$/)
  assert.equal(normalizeGeneratedTypes(normalized), normalized)
})

test("fails when the expected RPC signature changes", () => {
  assert.throws(
    () => normalizeGeneratedTypes(raw.replace("p_path: string", "p_path: number")),
    /Expected exactly one raw or normalized set_community_image signature/,
  )
  assert.throws(
    () => normalizeGeneratedTypes(`${raw}\n${raw}`),
    /Expected exactly one raw or normalized set_community_image signature/,
  )
})

test("leaves the committed generated file unchanged", () => {
  const path = new URL("../../supabase/database.generated.ts", import.meta.url)
  const generated = readFileSync(path, "utf8")
  assert.equal(normalizeGeneratedTypes(generated), generated)
  // The committed form omits the blank line emitted by Supabase CLI 2.107.0.
  assert.match(generated, /[^\n]\n$/)
})
