import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

// Structural guards over supabase/migrations, derived from two bugs the parent
// project (Juanjfmr/Bivaque) hit in production and had to fix after the fact:
//
//   1. A policy on `user_roles` checked the operator role with an inline
//      `exists (select ... from public.user_roles)` — recursive by construction.
//      It raised "infinite recursion detected in policy for relation" at every
//      call site. The fix was a `security definer` helper, which bypasses RLS
//      and breaks the cycle.
//   2. Policies in the first migration referenced tables only created in the
//      second, so those policies were never created and the bootstrap could not
//      be reproduced from an empty database.
//
// Neither is present here today. These tests keep it that way: they run in
// milliseconds and fail before pgTAP ever needs a container.

const root = join(import.meta.dirname, "..", "..")
const MIGRATIONS = join(root, "supabase", "migrations")

const files = readdirSync(MIGRATIONS)
  .filter((name) => name.endsWith(".sql"))
  .sort()

const POLICY = /create\s+policy\s+"?(\w+)"?\s+on\s+(public|private)\.(\w+)([\s\S]*?);\s*(?=\n|$)/gi
const TABLE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(public|private)\.(\w+)/gi
const FUNCTION =
  /create\s+(?:or\s+replace\s+)?function\s+(public|private)\.(\w+)\s*\([\s\S]*?\)\s*([\s\S]*?)\bas\s+\$\$/gi
const RELATION_REF = /(?:from|join)\s+(public|private)\.(\w+)/gi
const FUNCTION_CALL = /(public|private)\.(\w+)\s*\(/gi

/** Migration in which each relation is first created. */
const tableOrigin = new Map()
/** Qualified function name -> whether its header declares `security definer`. */
const securityDefiner = new Map()
/** Every `create policy` block, with the relation it guards and its body. */
const policies = []

for (const file of files) {
  const sql = readFileSync(join(MIGRATIONS, file), "utf8")

  for (const [, schema, name] of sql.matchAll(TABLE)) {
    const relation = `${schema}.${name}`.toLowerCase()
    if (!tableOrigin.has(relation)) tableOrigin.set(relation, file)
  }

  // A later `create or replace` wins: it is the definition that ends up applied.
  for (const [, schema, name, header] of sql.matchAll(FUNCTION)) {
    securityDefiner.set(`${schema}.${name}`.toLowerCase(), /security\s+definer/i.test(header))
  }

  for (const [, name, schema, relation, body] of sql.matchAll(POLICY)) {
    policies.push({ file, name, relation: `${schema}.${relation}`.toLowerCase(), body })
  }
}

test("the parser actually reads the schema", () => {
  // Given a regex-based reader, a silent parsing failure would make every
  // assertion below pass vacuously
  // When the parsed counts are checked against conservative floors
  // Then the reader is proven to have seen migrations, policies and functions
  assert.ok(files.length >= 20, `expected migrations, parsed ${files.length}`)
  assert.ok(policies.length >= 30, `expected policies, parsed ${policies.length}`)
  assert.ok(tableOrigin.size >= 20, `expected tables, parsed ${tableOrigin.size}`)
  assert.ok(securityDefiner.size >= 30, `expected functions, parsed ${securityDefiner.size}`)
})

test("no policy queries the relation it guards", () => {
  // Given every policy block
  // When its body is scanned for a reference back to its own relation
  const recursive = policies
    .filter(({ relation, body }) => {
      const [schema, name] = relation.split(".")
      return new RegExp(`(from|join)\\s+${schema}\\.${name}\\b`, "i").test(body)
    })
    .map(({ file, name, relation }) => `${name} on ${relation} (${file})`)

  // Then none exists — a self-referential policy recurses at evaluation time.
  // Authorisation that needs the guarded table belongs in a `security definer`
  // helper, which bypasses RLS and terminates the cycle.
  assert.deepEqual(recursive, [], `self-referential policies: ${recursive.join(", ")}`)
})

test("no policy references a relation created in a later migration", () => {
  // Given every policy block
  // When each relation it reads is resolved to the migration that creates it
  const forward = []
  for (const { file, name, body } of policies) {
    for (const [, schema, table] of body.matchAll(RELATION_REF)) {
      const relation = `${schema}.${table}`.toLowerCase()
      const origin = tableOrigin.get(relation)
      if (origin && origin > file) {
        forward.push(`${name} (${file}) -> ${relation} created in ${origin}`)
      }
    }
  }

  // Then none points forward — such a policy is never created on a fresh
  // database, so the deployed schema silently differs from the source.
  assert.deepEqual(forward, [], `forward references: ${forward.join(", ")}`)
})

test("every function called from a policy is security definer", () => {
  // Given the functions invoked inside policy bodies
  const called = new Map()
  for (const { file, name, relation, body } of policies) {
    for (const [, schema, fn] of body.matchAll(FUNCTION_CALL)) {
      const qualified = `${schema}.${fn}`.toLowerCase()
      if (!called.has(qualified)) called.set(qualified, [])
      called.get(qualified).push(`${name} on ${relation} (${file})`)
    }
  }

  // When each is resolved against its declaration
  const offenders = []
  for (const [qualified, callers] of called) {
    if (!securityDefiner.has(qualified)) {
      offenders.push(`${qualified} is not defined in any migration (used by ${callers[0]})`)
      continue
    }
    if (!securityDefiner.get(qualified)) {
      offenders.push(`${qualified} lacks security definer (used by ${callers[0]})`)
    }
  }

  // Then all of them bypass RLS. A helper that does not is re-evaluated under
  // the caller's policies, which either recurses or silently denies.
  assert.deepEqual(
    offenders,
    [],
    `policy helpers without security definer: ${offenders.join(", ")}`,
  )
})
