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
  assert.match(workflow, /^ {2}android:/m)
  assert.match(workflow, /^ {2}ios:/m)
})

test("actions têm versões fixadas e provas executam em ambos os jobs", () => {
  const actions = [...workflow.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map((m) => m[1])
  assert.ok(actions.length >= 10)
  for (const action of actions) assert.match(action, /^[\w.-]+\/[\w.-]+@v\d+(?:\.\d+)*$/)
  assert.match(workflow, /reactivecircus\/android-emulator-runner@v\d/)
  assert.match(workflow, /node tests\/nativo\/android\.mjs/)
  assert.match(workflow, /node tests\/nativo\/ios\.mjs/)
  assert.match(workflow, /if: always\(\)/)
  assert.match(workflow, /actions\/upload-artifact@v\d/)
})

test("iOS só prova tela renderizada e não registra diálogo como link", () => {
  const ios = readFileSync("tests/nativo/ios.mjs", "utf8")
  assert.match(ios, /renderThresholdBytes = 50_000/)
  assert.match(ios, /elapsed <= 60_000/)
  assert.match(ios, /elapsed \+= 3_000/)
  assert.match(ios, /PNG \$\{size\} bytes/)
  assert.match(ios, /osascript/)
  assert.match(ios, /click button "Open"/)
  assert.match(ios, /link profundo no iOS não provado no CI: o simctl pede confirmação/)
  assert.match(ios, /unlinkSync\(entryCapture\)/)
  assert.match(workflow, /CFBundleExecutable/)
  assert.match(workflow, /ios-app\.log/)
  assert.match(workflow, /ios-webkit\.log/)
  assert.match(workflow, /Content Security Policy/)
})
