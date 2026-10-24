// Confere a matriz de permissão (R2) contra o retrato (R1) do redesenho da Comunidade.
// Toda regra do retrato precisa de uma decisão (mantida, mudada ou removida) em algum
// rascunho da matriz, e a mesma regra não pode ter decisões diferentes em dois rascunhos.
// Enquanto um rascunho não existe, as regras das tabelas dele ficam de fora.
//   node --test scripts/redesenho/conferir-matriz.test.mjs
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const dir = join(process.cwd(), "docs", "agents", "redesenho")
const DRAFTS = {
  "R2-matriz-grupos.md": ["groups", "group_memberships", "group_join_reasons", "group_join_attempts"],
  "R2-matriz-publicacoes.md": ["posts", "comments", "post_reactions", "post_saves", "post_follows"],
  "R2-matriz-evento-pergunta.md": ["events", "event_rsvps", "recommendation_requests"],
  "R2-matriz-vila-fundacao.md": [
    "communities",
    "community_memberships",
    "community_invitations",
    "community_join_reasons",
    "provider_accounts",
    "provider_invitations",
    "provider_reach",
    "listings",
    "dm_conversations",
    "notifications",
    "reports",
  ],
}
const DECISION = /^\|\s*(R1-\d+)\s*\|[^\n]*\|\s*(mantida|mudada|removida)\s*\|[^\n]*\|\s*$/gm

function idsByTable(retrato) {
  const byTable = new Map()
  const sections = retrato.split(/^## /m).slice(1)
  for (const section of sections) {
    const title = section.slice(0, section.indexOf("\n")).trim()
    const match = /^(?:public|private)\.([a-z_]+)$/.exec(title)
    if (!match) continue
    byTable.set(match[1], new Set(section.match(/R1-\d+/g) ?? []))
  }
  return byTable
}

test("toda regra do retrato tem uma decisão só na matriz", () => {
  const retrato = readFileSync(join(dir, "R1-retrato.md"), "utf8")
  const byTable = idsByTable(retrato)
  const decisions = new Map()
  const required = new Set()
  let drafts = 0

  for (const [file, tables] of Object.entries(DRAFTS)) {
    const path = join(dir, file)
    if (!existsSync(path)) continue
    drafts++
    for (const table of tables) {
      assert.ok(byTable.has(table), `${table} não está no retrato`)
      for (const id of byTable.get(table)) required.add(id)
    }
    for (const [, id, decision] of readFileSync(path, "utf8").matchAll(DECISION)) {
      const seen = decisions.get(id)
      assert.ok(
        !seen || seen.decision === decision,
        `${id}: ${seen?.decision} em ${seen?.file}, ${decision} em ${file}`,
      )
      decisions.set(id, { decision, file })
    }
  }

  assert.ok(drafts > 0, "nenhum rascunho da matriz em docs/agents/redesenho/")
  const missing = [...required].filter((id) => !decisions.has(id)).sort()
  assert.deepEqual(missing, [], `regras do retrato sem decisão: ${missing.join(", ")}`)
})
