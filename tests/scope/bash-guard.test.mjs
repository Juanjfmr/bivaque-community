// O PreToolUse firewall (.claude/hooks/bash-guard.mjs) decide o que o agente
// pode executar. Ele ja falhou aberto uma vez: a extracao por
// grep -o '"command":"[^"]*"' parava na primeira aspa escapada do JSON, e um
// comando iniciado por atribuicao com aspas escapava de todas as regras.
// Estes testes existem para que essa classe de bypass nao volte silenciosamente.

import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const guard = path.join(repoRoot, ".claude", "hooks", "bash-guard.mjs")

// Devolve "allow" ou "block" rodando o guard com um payload real.
function verdict(payload) {
  const result = spawnSync(process.execPath, [guard], {
    input: JSON.stringify(payload),
    encoding: "utf8",
  })
  return result.status === 0 ? "allow" : "block"
}

const bash = (command) => verdict({ tool_name: "Bash", tool_input: { command } })
const write = (file_path) => verdict({ tool_name: "Write", tool_input: { file_path } })

test("comando perigoso escondido atras de uma aspa continua bloqueado", () => {
  // A regressao original: identico ao caso abaixo, mas precedido de uma
  // atribuicao com aspas. Antes do parser JSON isto era PERMITIDO.
  assert.equal(bash('DIR="/tmp/x" && rm -rf / --no-preserve-root'), "block")
  assert.equal(bash('X="a" && cat .env'), "block")
  assert.equal(bash('P="origin" && git push --force origin main'), "block")
})

test("regras destrutivas valem na forma simples", () => {
  assert.equal(bash("rm -rf /tmp/x"), "block")
  assert.equal(bash("rm -fr /tmp/x"), "block")
  assert.equal(bash("git push --force origin main"), "block")
  assert.equal(bash("npx pnpm@11.18.0 db:reset"), "block")
  assert.equal(bash("cat .env"), "block")
})

test("supabase --linked permite leitura e barra escrita", () => {
  assert.equal(bash("npx supabase migration list --linked"), "allow")
  assert.equal(bash("npx supabase db diff --linked"), "allow")
  assert.equal(bash("npx supabase inspect db table-sizes --linked"), "allow")

  assert.equal(bash("npx supabase db push --linked"), "block")
  assert.equal(bash("npx supabase db reset --linked"), "block")
  assert.equal(bash("npx supabase db dump --linked"), "block")
  // api-keys e leitura, mas imprime a service_role key: fica bloqueado.
  assert.equal(bash("npx supabase projects api-keys --linked"), "block")
})

test("comandos comuns seguem passando", () => {
  assert.equal(bash("git status"), "allow")
  assert.equal(bash("npx supabase migration list"), "allow")
  assert.equal(bash('node -e "console.log(1)"'), "allow")
})

test("arquivos de segredo nao podem ser escritos, mas o template pode", () => {
  assert.equal(write(".env"), "block")
  assert.equal(write("apps/web/.env.local"), "block")
  assert.equal(write("certs/server.key"), "block")
  assert.equal(write("certs/server.pem"), "block")

  // Bug da versao anterior: a isencao comparava com o glob literal
  // "*.env.example" e nunca casava, entao o template era sempre bloqueado.
  assert.equal(write(".env.example"), "allow")
  assert.equal(write("apps/web/.env.example"), "allow")
  assert.equal(write("apps/mobile/package.json"), "allow")
})

test("payload ilegivel falha fechado", () => {
  const result = spawnSync(process.execPath, [guard], { input: "nao e json", encoding: "utf8" })
  assert.notEqual(result.status, 0)
})
