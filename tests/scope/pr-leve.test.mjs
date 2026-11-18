// PR leve roda só os Fast checks (pull-request-ci.yml, job changes). A lista de
// caminhos leves decide se build, banco e E2E podem ficar de fora; errar para o lado
// leve deixaria código passar sem o CI completo. Estes testes travam a fronteira.

import assert from "node:assert/strict"
import test from "node:test"
import { classificar, nomesDaApi, TETO_DE_ARQUIVOS } from "../../scripts/ci/pr-leve.mjs"

test("quadro, docs, RATIFICACAO e regras de agente são leves", () => {
  const { leve } = classificar([
    "tools/backend-kanban/public/board.json",
    "tools/backend-kanban/BOARD.md",
    "docs/decisions/RATIFICACAO.md",
    "docs/decisions/ADR-20261118-x.md",
    "docs/agents/tasks/HRN-010.task.yml",
    "README.md",
    "AGENTS.md",
    "supabase/AGENTS.md",
    "CLAUDE.md",
  ])
  assert.equal(leve, true)
})

test("código, migration, workflow, lockfile e docs/legal exigem o completo", () => {
  for (const caminho of [
    "apps/web/lib/x.ts",
    "apps/app/src/main.tsx",
    "supabase/migrations/20261118000000_x.sql",
    "supabase/tests/x.sql",
    ".github/workflows/pull-request-ci.yml",
    "pnpm-lock.yaml",
    "package.json",
    "scripts/ci/pr-leve.mjs",
    "tests/scope/pr-leve.test.mjs",
    "tools/backend-kanban/src/board.mjs",
    "docs/legal/PRIVACIDADE.md",
    "apps/web/README.md",
    "apps/app/AGENTS.md",
    "apps/web/CLAUDE.md",
    "packages/domain/AGENTS.md",
  ]) {
    const { leve, motivo } = classificar(["docs/LANCAMENTO.md", caminho])
    assert.equal(leve, false, caminho)
    assert.match(motivo, new RegExp(caminho.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
})

test("na dúvida não é leve: lista vazia ou no teto da API", () => {
  assert.equal(classificar([]).leve, false)
  assert.equal(classificar(undefined).leve, false)
  const cheia = Array.from({ length: TETO_DE_ARQUIVOS }, (_, i) => `docs/n${i}.md`)
  assert.equal(classificar(cheia).leve, false)
})

test("renomeado conta pelo nome antigo também", () => {
  const nomes = nomesDaApi([
    { filename: "docs/velho.ts", previous_filename: "apps/web/lib/velho.ts" },
  ])
  assert.deepEqual(nomes, ["docs/velho.ts", "apps/web/lib/velho.ts"])
  assert.equal(classificar(nomes).leve, false)
})
