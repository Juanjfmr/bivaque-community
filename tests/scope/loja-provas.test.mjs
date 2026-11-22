import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const workflow = readFileSync(".github/workflows/app-loja-provas.yml", "utf8")

test("workflow de provas tem escopo e permissões mínimas", () => {
  assert.match(workflow, /workflow_dispatch:/)
  assert.match(workflow, /pull_request:/)
  assert.match(workflow, /permissions:\s+contents: read/)
  assert.doesNotMatch(workflow, /secrets\.|--linked/)
  assert.doesNotMatch(workflow, /(?:write-all|contents:\s*write)/)
  assert.match(workflow, /^  android:/m)
  assert.match(workflow, /^  ios:/m)
})

test("actions têm versões fixadas e provas executam em ambos os jobs", () => {
  const actions = [...workflow.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map((m) => m[1])
  assert.ok(actions.length >= 10)
  for (const action of actions) assert.match(action, /^[\w.-]+\/[\w.-]+@v\d+(?:\.\d+)*$/)
  assert.match(workflow, /reactivecircus\/android-emulator-runner@v\d/)
  assert.match(workflow, /node tests\/nativo\/android\.mjs/)
  assert.match(workflow, /simctl openurl/)
  assert.match(workflow, /actions\/upload-artifact@v\d/)
})
