import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { inspectEvidence } from "../../tools/backend-kanban/src/readiness-evidence.mjs"
import {
  classifyChecks,
  collectGithub,
  verifyGithubReference,
} from "../../tools/backend-kanban/src/readiness-github.mjs"

const revision = "a".repeat(40)
const requirements = [{ workflow: "ci.yml", steps: ["Banco", "Permissões"] }]
const run = {
  workflow: "ci.yml",
  revision,
  status: "completed",
  conclusion: "success",
  url: "https://github.com/example/repo/actions/runs/1",
  steps: [
    { name: "Banco", conclusion: "success" },
    { name: "Permissões", conclusion: "success" },
  ],
}

test("comprovação requer todos os passos e a revisão correta", () => {
  assert.equal(classifyChecks(requirements, [run], revision).status, "success")
  assert.equal(classifyChecks(requirements, [run], "b".repeat(40)).status, "pending")
  assert.equal(
    classifyChecks(requirements, [{ ...run, steps: run.steps.slice(1) }], revision).status,
    "inconclusive",
  )
  assert.equal(
    classifyChecks(
      requirements,
      [{ ...run, steps: [{ name: "Banco", conclusion: "failure" }] }],
      revision,
    ).status,
    "failure",
  )
  assert.equal(
    classifyChecks(requirements, [{ ...run, status: "in_progress" }], revision).status,
    "pending",
  )
})

test("resposta negada pelo GitHub é erro de atualização e não inventário vazio", async () => {
  await assert.rejects(
    collectGithub({
      repository: "example/repo",
      token: "synthetic",
      revision,
      requirements: { frontend: requirements },
      request: async () => ({ ok: false, status: 403 }),
    }),
    /403/,
  )
})

test("cancelamento não passa mesmo quando os passos anteriores terminaram verdes", () => {
  for (const conclusion of ["cancelled", "failure", "timed_out", "skipped"]) {
    assert.equal(
      classifyChecks(requirements, [{ ...run, conclusion }], revision).status,
      "inconclusive",
    )
  }
})

test("gates herdam provas compatíveis e mudanças no lockfile invalidam todos os aceites", async () => {
  const root = mkdtempSync(join(tmpdir(), "bivaque-evidence-"))
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim()
  try {
    git("init", "-q")
    git("config", "user.name", "Fixture")
    git("config", "user.email", "fixture@example.invalid")
    writeFileSync(join(root, "proof.md"), "Parecer sintético de fixture")
    writeFileSync(join(root, "pnpm-lock.yaml"), "version: 1")
    git("add", ".")
    git("commit", "-qm", "fixture")
    const first = git("rev-parse", "HEAD")
    const receipt = { revision: first, proof: ["proof.md"] }
    const board = {
      launch: {
        source: "scope.md",
        paths: { frontend: ["apps/app"], integration: ["apps"] },
        journeys: [{ id: "F01", cardId: "FLOW" }],
        gates: ["LEGAL"],
      },
      cards: [
        { id: "FLOW", acceptance: { frontend: receipt } },
        { id: "LEGAL", acceptance: { integration: receipt } },
      ],
    }
    git("commit", "--allow-empty", "-qm", "unrelated metadata")
    const unchanged = await inspectEvidence(root, board, git("rev-parse", "HEAD"))
    assert.equal(unchanged.unchanged["LEGAL:integration"], true)
    assert.equal(unchanged.evidenceValid["F01:frontend"], true)
    writeFileSync(join(root, "pnpm-lock.yaml"), "version: 2")
    git("add", ".")
    git("commit", "-qm", "changed dependency")
    const changed = await inspectEvidence(root, board, git("rev-parse", "HEAD"))
    assert.equal(changed.unchanged["F01:frontend"], false)
    assert.equal(changed.unchanged["LEGAL:integration"], false)
    receipt.proof = ["does/not/exist.md"]
    assert.equal((await inspectEvidence(root, board, first)).evidenceValid["F01:frontend"], false)
    receipt.proof = ["../outside.md"]
    assert.equal((await inspectEvidence(root, board, first)).evidenceValid["F01:frontend"], false)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test("referência remota exige execução real bem-sucedida da revisão indicada", async () => {
  const input = {
    repository: "example/repo",
    token: "synthetic",
    revision,
    request: async () => ({
      ok: true,
      json: async () => ({ head_sha: revision, status: "completed", conclusion: "success" }),
    }),
  }
  assert.equal(
    await verifyGithubReference("https://github.com/example/repo/actions/runs/1", input),
    true,
  )
  assert.equal(await verifyGithubReference("https://example.invalid/actions/runs/1", input), false)
  assert.equal(
    await verifyGithubReference("https://github.com/example/repo/actions/runs/1", {
      ...input,
      revision: "b".repeat(40),
    }),
    false,
  )
})

test("produção da Vercel é identificada pelo projeto e ambiente, mesmo quando ref é um SHA", async () => {
  const request = async (url) => ({
    ok: true,
    json: async () =>
      url.includes("/statuses")
        ? [
            {
              state: "success",
              environment_url: "https://bivaque-community-web-fixture.vercel.app",
              updated_at: "2026-11-05T12:00:00Z",
            },
          ]
        : url.includes("/deployments?")
          ? [
              {
                id: 1,
                sha: revision,
                ref: revision,
                production_environment: true,
                environment: "Production – bivaque-community-web",
              },
            ]
          : { workflow_runs: [] },
  })
  const result = await collectGithub({
    repository: "example/repo",
    token: "synthetic",
    revision,
    requirements: { frontend: requirements },
    request,
  })
  assert.equal(result.production.revision, revision)
})

test("artefato publicável contém só quatro arquivos, sem o quadro interno", () => {
  const output = mkdtempSync(join(tmpdir(), "bivaque-readiness-"))
  try {
    execFileSync(process.execPath, ["tools/backend-kanban/src/publish.mjs", "--out", output], {
      encoding: "utf8",
    })
    assert.deepEqual(readdirSync(output).sort(), [
      "app.js",
      "index.html",
      "snapshot.json",
      "styles.css",
    ])
    const snapshot = JSON.parse(readFileSync(join(output, "snapshot.json"), "utf8"))
    assert.equal(snapshot.journeys.length, 10)
    assert.equal(snapshot.metrics.integration.percent, 0)
    assert.equal(snapshot.provisional, true)
    assert.doesNotMatch(
      JSON.stringify(snapshot),
      /SERVICE_ROLE|chave-api-dados|"proof":|"description":/,
    )
  } finally {
    rmSync(output, { recursive: true, force: true })
  }
})
