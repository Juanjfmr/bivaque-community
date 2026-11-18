// O CI é a única prova que o repositório tem contra "deve estar funcionando".
// Estes testes leem os YAML dos workflows e travam as quatro medidas do HRN-005
// (ADR-20261114, emenda de 16/11): cancelamento por PR, Claude só sob demanda,
// label ci:full removida no merge e caches com fallback. Sem eles, apagar um
// `concurrency:` ou trocar o cache por um download silencioso não faz nada falhar
// até o próximo fechamento caro.

import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")
const workflows = join(root, ".github", "workflows")

const ler = (nome) => readFileSync(join(workflows, nome), "utf8")
const lerPacote = () => JSON.parse(readFileSync(join(root, "package.json"), "utf8"))
const pinDoPlaywright = () => lerPacote().devDependencies["@playwright/test"]

const COM_CANCELAMENTO = [
  "pull-request-ci.yml",
  "bivaque-app-visual-smoke.yml",
  "bivaque-r72-mobile-comparison.yml",
]

test("todo workflow de PR cancela o run anterior, e só em pull_request", () => {
  for (const nome of COM_CANCELAMENTO) {
    // Given a workflow that runs on pull_request
    const workflow = ler(nome)

    // When its concurrency block is read
    // Then it groups by workflow and PR number, falling back to the ref
    assert.match(
      workflow,
      /concurrency:\n {2}group: \$\{\{ github\.workflow \}\}-\$\{\{ github\.event\.pull_request\.number \|\| github\.ref \}\}/,
      nome,
    )
    // And it cancels only on pull_request: a main push is never cancelled
    assert.match(
      workflow,
      /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/,
      nome,
    )
    assert.doesNotMatch(workflow, /cancel-in-progress: true/, nome)
  }
})

test("o Claude Review só roda com a chave ligada ou com a label review:claude", () => {
  // Given the review workflow
  const workflow = ler("claude-review.yml")

  // Then the job is gated by the repository variable, or by an explicit label
  assert.match(workflow, /if: vars\.CLAUDE_REVIEW_ENABLED == 'true'/)
  assert.match(
    workflow,
    /contains\(github\.event\.pull_request\.labels\.\*\.name, 'review:claude'\)/,
  )
  // And the comment says re-enabling is the owner's act
  assert.match(workflow, /RELIGAR É ATO DO DONO/)
})

test("a label ci:full sai sozinha quando o PR é mergeado", () => {
  // Given the cleanup workflow
  const nome = "ci-label-cleanup.yml"
  assert.equal(existsSync(join(workflows, nome)), true)
  const workflow = ler(nome)

  // Then it listens to a closed pull request and only acts on a real merge
  assert.match(workflow, /pull_request:\n {4}types: \[closed\]/)
  assert.match(workflow, /github\.event\.pull_request\.merged == true/)
  // With the least permission that removes a label from a PR
  assert.match(workflow, /permissions:\n {2}contents: read\n {2}pull-requests: write/)
  assert.doesNotMatch(workflow, /contents: write/)
  // And deletes exactly the ci:full label through the API
  assert.match(workflow, /gh api -X DELETE "repos\/\$GH_REPO\/issues\/\$PR\/labels\/ci%3Afull"/)
})

test("os navegadores vêm de cache com fallback no cache miss", () => {
  const pin = pinDoPlaywright()

  for (const [nome, blocos] of [
    ["pull-request-ci.yml", 2], // ci-core e o matrix e2e-stateful
    ["bivaque-app-visual-smoke.yml", 1],
  ]) {
    // Given a workflow that installs Playwright Chromium
    const workflow = ler(nome)

    // Then the browsers directory is cached under the pinned version and the lockfile
    const caches = workflow.match(/path: ~\/\.cache\/ms-playwright/g) ?? []
    assert.equal(caches.length, blocos, `${nome}: cache por bloco de install`)
    assert.match(workflow, new RegExp(`key: \\$\\{\\{ runner\\.os \\}\\}-playwright-${pin}-`), nome)
    assert.match(workflow, /hashFiles\('pnpm-lock\.yaml'\)/, nome)

    // And the install stays as the cache-miss fallback, unchanged
    const instalar = workflow.match(
      /- name: (?:Install Playwright Chromium|Install Chromium)\n {8}if: steps\.playwright-browsers\.outputs\.cache-hit != 'true'\n {8}run: pnpm exec playwright install --with-deps chromium/g,
    )
    assert.equal(instalar?.length ?? 0, blocos, `${nome}: install só no cache miss`)
  }
})

test("as imagens do Supabase vêm de cache por tag, com pre-pull de fallback", () => {
  // Given the CI workflow with its two Supabase jobs
  const workflow = ler("pull-request-ci.yml")

  // Then the image set is cached in one tar per tag set
  const chaves = workflow.match(/key: supabase-images-2\.107\.0-[^\n]+/g) ?? []
  assert.equal(chaves.length, 2, "ci-core e e2e-stateful")
  assert.equal(chaves[0], chaves[1], "mesma chave nos dois jobs")

  // And every pulled tag is inside the cache key (drift de tag muda a chave)
  const chave = chaves[0]
  for (const bloco of blocosDoPrePull(workflow)) {
    for (const { nome, versao } of bloco.tags) {
      assert.ok(chave.includes(`${nome}-${versao}`), `chave do cache sem ${nome}:${versao}`)
    }
  }

  // And the load happens on a hit, while the backoff pull stays as the miss path
  assert.equal((workflow.match(/run: docker load -i \/tmp\/supabase-images\.tar/g) ?? []).length, 2)
  assert.equal(
    (workflow.match(/if: steps\.supabase-images\.outputs\.cache-hit != 'true'/g) ?? []).length,
    2,
  )
  assert.match(workflow, /for delay in 0 10 30 60/)
  // And the set is saved for the next run after the pull
  assert.equal((workflow.match(/docker save -o \/tmp\/supabase-images\.tar/g) ?? []).length, 2)
})

/** Cada bloco "Pre-pull Supabase stack images" com as tags que ele baixa. */
function blocosDoPrePull(workflow) {
  return workflow
    .split("- name: Pre-pull Supabase stack images")
    .slice(1)
    .map((trecho) => trecho.slice(0, trecho.indexOf("- name: Start local Supabase")))
    .map((trecho) => ({
      tags: [...trecho.matchAll(/^\s+pull ([^:\s]+):(\S+)/gm)].map(([, nome, versao]) => ({
        nome,
        versao,
      })),
    }))
}

test("cada passo de E2E é seguido da anotação de flake, que nunca muda o exit code", () => {
  for (const nome of ["pull-request-ci.yml", "bivaque-app-visual-smoke.yml"]) {
    // Given a workflow with E2E steps
    const workflow = ler(nome)
    const passos = workflow.match(/run: pnpm [^\n]*test:e2e[^\n]*/g) ?? []

    // Then every one of them produces the JSON report the annotation reads
    assert.ok(passos.length > 0, nome)
    assert.equal(
      (workflow.match(/PLAYWRIGHT_JSON_OUTPUT_FILE: /g) ?? []).length,
      passos.length,
      `${nome}: um relatório json por passo de E2E`,
    )
    assert.equal(
      (workflow.match(/node scripts\/ci\/anotar-flakes\.mjs /g) ?? []).length,
      passos.length,
      `${nome}: uma anotação por passo de E2E`,
    )
    // And the annotation runs even when the E2E step failed
    assert.match(workflow, /- name: Annotate flaky E2E tests\n {8}if: always\(\)/)
  }

  // And the script exists, and retries were not touched (they stay at 1)
  assert.equal(existsSync(join(root, "scripts", "ci", "anotar-flakes.mjs")), true)
  assert.match(readFileSync(join(root, "playwright.config.ts"), "utf8"), /retries: process\.env/)
  assert.doesNotMatch(readFileSync(join(root, "playwright.config.ts"), "utf8"), /failOnFlakyTests/)
})

test("a trava de merge é um script conferido, não um rito lembrado", () => {
  // Given the merge script and the lesson that names it
  const script = join(root, "scripts", "agents", "merge-seguro.mjs")
  assert.equal(existsSync(script), true)

  // Then it checks the same-SHA proofs before merging by squash
  const codigo = readFileSync(script, "utf8")
  assert.match(codigo, /merge_method: "squash"/)
  assert.match(codigo, /sha: headSha/)
  assert.match(codigo, /check-runs/)

  // And the lesson file sends every merge through it
  const licoes = readFileSync(join(root, "docs", "agents", "LICOES.md"), "utf8")
  assert.match(licoes, /merge-seguro\.mjs/)
})

test("PR leve pula a stack, mas o agregador sempre reporta", () => {
  // Given the PR CI workflow
  const workflow = ler("pull-request-ci.yml")

  // Then a classifier job reads the PR files with read-only permission
  assert.match(workflow, /\n {2}changes:\n/)
  assert.match(workflow, /run: node scripts\/ci\/pr-leve\.mjs "\$PR"/)
  assert.match(workflow, /pull-requests: read/)
  assert.doesNotMatch(workflow, /pull-requests: write/)

  // And both stack jobs are skipped for a light PR, even with ci:full
  const gate =
    "needs: changes\n    if: needs.changes.outputs.leve != 'true' && (github.event_name != 'pull_request' || contains(github.event.pull_request.labels.*.name, 'ci:full'))"
  assert.equal(workflow.split(gate).length - 1, 2, "ci-core e e2e-stateful")

  // And the aggregator runs for a light PR and demands the classifier and fast green
  assert.match(workflow, /needs: \[changes, fast, ci-core, e2e-stateful\]/)
  assert.match(workflow, /\|\| needs\.changes\.outputs\.leve == 'true'\)/)
  assert.match(workflow, /if \[ "\$ch" != "success" \] \|\| \[ "\$fa" != "success" \]; then/)
})
