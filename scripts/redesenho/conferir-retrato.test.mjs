import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const dumpPath = path.join(root, "docs/agents/redesenho/schema-dump.sql")
const committedPath = path.join(root, "docs/agents/redesenho/R1-retrato.md")
const generator = path.join(root, "scripts/redesenho/retrato.mjs")
const targets = [
  ...["groups", "group_memberships", "group_join_reasons", "group_join_attempts", "posts", "comments", "post_reactions", "post_saves", "post_follows", "events", "event_rsvps", "recommendation_requests", "communities", "community_memberships", "community_invitations", "community_join_reasons", "provider_accounts", "provider_reach", "listings", "dm_conversations", "notifications", "reports"].map((name) => ["public", name]),
  ["private", "provider_invitations"],
]
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

test("o retrato commitado está atualizado com o dump e cobre os objetos encontrados", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "redesenho-r1-"))
  try {
    const generated = path.join(temp, "R1-retrato.md")
    execFileSync(process.execPath, [generator, generated], { cwd: root, stdio: "pipe" })
    const [expected, actual, dump] = await Promise.all([readFile(committedPath, "utf8"), readFile(generated, "utf8"), readFile(dumpPath, "utf8")])
    assert.equal(actual, expected, "R1-retrato.md precisa ser regenerado após mudanças no dump ou no gerador")

    const policyStatements = [...dump.matchAll(/CREATE POLICY\s+"([^"]+)"\s+ON\s+"([^"]+)"\."([^"]+)"[\s\S]*?;/g)]
    const triggerStatements = [...dump.matchAll(/CREATE OR REPLACE TRIGGER\s+"([^"]+)"[\s\S]*?\s+ON\s+"([^"]+)"\."([^"]+)"[\s\S]*?;/g)]
    const grantStatements = [...dump.matchAll(/(?:^|\n)((?:GRANT|REVOKE)\b[\s\S]*?;)/g)].map((m) => m[1])
    const functionStatements = [...dump.matchAll(/CREATE OR REPLACE FUNCTION\s+"([^"]+)"\."([^"]+)"[\s\S]*?\bAS\s+(\$[A-Za-z0-9_]*\$)\s*([\s\S]*?)\3;/g)]

    for (const [schema, table] of targets) {
      const key = `${schema}.${table}`
      const row = actual.match(new RegExp(`^\\| ${escape(key)} \\| (\\d+) \\| (\\d+) \\| (\\d+) \\| (\\d+) \\| (\\d+) \\| (\\d+) \\|$`, "m"))
      assert.ok(row, `contagem ausente para ${key}`)
      const policies = policyStatements.filter((m) => m[2] === schema && m[3] === table)
      const triggers = triggerStatements.filter((m) => m[2] === schema && m[3] === table)
      const grants = grantStatements.filter((s) => new RegExp(`\\bON(?: TABLE)?\\s+"${escape(schema)}"\\."${escape(table)}"`, "i").test(s))
      assert.equal(Number(row[3]), policies.length, `${key}: contagem de policies`)
      assert.equal(Number(row[4]), triggers.length, `${key}: contagem de triggers`)
      assert.equal(Number(row[5]), grants.length, `${key}: contagem de grants/revokes`)
      for (const m of policies) assert.ok(actual.includes(m[1]), `${key}: policy ${m[1]} ausente no retrato`)
      for (const m of triggers) assert.ok(actual.includes(m[1]), `${key}: trigger ${m[1]} ausente no retrato`)

      const functions = functionStatements.filter((m) => new RegExp(`(?:"${escape(schema)}"\\s*\\.\\s*"${escape(table)}"|\\b${escape(schema)}\\s*\\.\\s*${escape(table)}\\b)`, "i").test(m[4]))
      for (const m of functions) assert.ok(actual.includes(`${m[1]}.${m[2]}`), `${key}: função ${m[1]}.${m[2]} ausente no retrato`)
    }
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})
