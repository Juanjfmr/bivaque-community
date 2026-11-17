import assert from "node:assert/strict"
import test from "node:test"
import {
  avaliar,
  CHECK_AGREGADO,
  CHECK_COMPLETO,
  CHECK_VISUAL,
  mergeSeguro,
  obterToken,
} from "../../scripts/agents/merge-seguro.mjs"

// SHA completo de 40 hex: o script recusa atalho justamente porque o merge precisa
// ser amarrado ao commit conferido.
const SHA = "0123456789abcdef0123456789abcdef01234567"
const OUTRO_SHA = "fedcba9876543210fedcba9876543210fedcba98"

const check = (name, { status = "completed", conclusion = "success", headSha = SHA } = {}) => ({
  name,
  status,
  conclusion,
  head_sha: headSha,
})

const run = (name, id, conclusion, completed_at) => ({
  ...check(name, { conclusion }),
  id,
  completed_at,
})

function resposta(corpo, { ok = true, status = 200 } = {}) {
  return { ok, status, text: async () => JSON.stringify(corpo) }
}

/**
 * API simulada: responde pull, arquivos, check-runs e o merge, e guarda as
 * chamadas para que o teste possa provar que não houve PUT quando a recusa vale.
 */
function apiFalsa({
  estado = "open",
  headSha = SHA,
  arquivos = [],
  checkRuns = [],
  merge = { merged: true, sha: OUTRO_SHA },
} = {}) {
  const chamadas = []
  const fetchImpl = async (url, opcoes = {}) => {
    const metodo = opcoes.method ?? "GET"
    chamadas.push({ url, metodo, corpo: opcoes.body })
    if (url.includes("/files")) return resposta(arquivos.map((filename) => ({ filename })))
    if (url.includes("/check-runs"))
      return resposta({ total_count: checkRuns.length, check_runs: checkRuns })
    if (metodo === "PUT") return resposta(merge)
    return resposta({ number: 7, state: estado, head: { sha: headSha } })
  }
  return { fetchImpl, chamadas, merges: () => chamadas.filter((c) => c.metodo === "PUT") }
}

const rodar = (opcoes) => {
  const api = apiFalsa(opcoes)
  return mergeSeguro({
    pr: 7,
    repo: "bivaque/community",
    token: "escopo",
    fetchImpl: api.fetchImpl,
  }).then((veredito) => ({ veredito, api }))
}

test("verde no completo e no visual: mergeia por squash no SHA completo conferido", async () => {
  // Given a PR whose head SHA has both required checks green
  const { veredito, api } = await rodar({
    arquivos: ["apps/app/src/main.tsx"],
    checkRuns: [check(CHECK_COMPLETO), check(CHECK_AGREGADO), check(CHECK_VISUAL)],
  })

  // Then the merge goes through, pinned to that SHA, by squash
  assert.equal(veredito.ok, true)
  assert.equal(veredito.merged, true)
  assert.equal(veredito.sha, SHA)
  assert.equal(api.merges().length, 1)
  assert.match(api.merges()[0].url, /\/pulls\/7\/merge$/)
  assert.deepEqual(JSON.parse(api.merges()[0].corpo), { sha: SHA, merge_method: "squash" })
})

test("completo vermelho: recusa e não tenta o merge", async () => {
  // Given the full PR CI finished red on this SHA
  const { veredito, api } = await rodar({
    arquivos: ["apps/app/src/main.tsx"],
    checkRuns: [
      check(CHECK_COMPLETO, { conclusion: "failure" }),
      check(CHECK_AGREGADO, { conclusion: "failure" }),
      check(CHECK_VISUAL),
    ],
  })

  // Then the merge is refused with the conclusion in the message, and no PUT happens
  assert.equal(veredito.ok, false)
  assert.equal(veredito.merged, false)
  assert.match(veredito.motivo, /PR CI completo está "failure"/)
  assert.equal(api.merges().length, 0)
})

test("stateful vermelho: o agregador reprova mesmo com o ci-core verde", async () => {
  // Given ci-core green but the aggregator red (an e2e-stateful viewport failed)
  const { veredito, api } = await rodar({
    arquivos: ["apps/app/src/main.tsx"],
    checkRuns: [
      check(CHECK_COMPLETO),
      check(CHECK_AGREGADO, { conclusion: "failure" }),
      check(CHECK_VISUAL),
    ],
  })

  // Then the merge is refused, naming the incompleteness instead of trusting ci-core
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /PR CI completo está "failure"/)
  assert.match(veredito.motivo, /e2e-stateful/)
  assert.equal(api.merges().length, 0)
})

test("completo pendente: recusa esperando o run terminar", async () => {
  // Given the full PR CI is still running
  const { veredito, api } = await rodar({
    arquivos: ["apps/app/src/main.tsx"],
    checkRuns: [
      check(CHECK_COMPLETO, { status: "in_progress", conclusion: null }),
      check(CHECK_VISUAL),
    ],
  })

  // Then it is refused as pending, not as failure
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /ainda está "in_progress"/)
  assert.equal(api.merges().length, 0)
})

test("completo ausente: recusa apontando a label ci:full", async () => {
  // Given a PR whose checks only include the visual
  const { veredito } = await rodar({ checkRuns: [check(CHECK_VISUAL)] })

  // Then the refusal names the missing job and the act that makes it run
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /ci-core/)
  assert.match(veredito.motivo, /ci:full/)
})

test("visual ausente por paths, com o PR fora de apps/app: mergeia", async () => {
  // Given a docs-only PR, where the visual workflow's paths filter never fires
  const { veredito, api } = await rodar({
    arquivos: ["docs/LANCAMENTO.md", "README.md"],
    checkRuns: [check(CHECK_COMPLETO), check(CHECK_AGREGADO)],
  })

  // Then the absence is accepted as a legitimate skip
  assert.equal(veredito.ok, true)
  assert.equal(veredito.merged, true)
  assert.match(veredito.motivo, /pulado por paths/)
  assert.equal(api.merges().length, 1)
})

test("visual ausente num PR que toca apps/app: recusa", async () => {
  // Given a PR that changes the app shell
  const { veredito, api } = await rodar({
    arquivos: ["apps/app/src/routes/inicio.tsx"],
    checkRuns: [check(CHECK_COMPLETO), check(CHECK_AGREGADO)],
  })

  // Then a missing visual is a missing proof, not a skip
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /deveria ter rodado/)
  assert.equal(api.merges().length, 0)
})

test("visual vermelho: recusa mesmo com o completo verde", async () => {
  // Given the full CI green and the visual red on the same SHA
  const { veredito } = await rodar({
    arquivos: ["apps/app/src/main.tsx"],
    checkRuns: [
      check(CHECK_COMPLETO),
      check(CHECK_AGREGADO),
      check(CHECK_VISUAL, { conclusion: "failure" }),
    ],
  })

  // Then the merge does not happen
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /Visual Smoke está "failure"/)
})

test("check de outro SHA: recusa por divergência", async () => {
  // Given checks that belong to a different commit than the PR head
  const { veredito, api } = await rodar({
    arquivos: ["apps/app/src/main.tsx"],
    checkRuns: [
      check(CHECK_COMPLETO, { headSha: OUTRO_SHA }),
      check(CHECK_VISUAL, { headSha: OUTRO_SHA }),
    ],
  })

  // Then the verdict names the divergence instead of trusting an old green
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /pertence a fedcba987654/)
  assert.equal(api.merges().length, 0)
})

test("SHA curto: recusa antes de consultar checks", () => {
  // Given a head SHA that is not the full 40 characters
  // When the verdict is formed
  const veredito = avaliar({ headSha: "0123456", estado: "open", checkRuns: [], arquivos: [] })

  // Then it is refused as incomplete
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /não é completo/)
})

test("merge recusado pelo GitHub: devolve recusa com a mensagem", async () => {
  // Given the checks are green but the API refuses the merge
  const { veredito } = await rodar({
    arquivos: ["docs/LANCAMENTO.md"],
    checkRuns: [check(CHECK_COMPLETO), check(CHECK_AGREGADO)],
    merge: { merged: false, message: "Pull Request is not mergeable" },
  })

  // Then the refusal carries the API's own message
  assert.equal(veredito.ok, false)
  assert.equal(veredito.merged, false)
  assert.match(veredito.motivo, /não mergeable|not mergeable/)
})

test("run verde vence run pulado independentemente da ordem da API", () => {
  for (const duplicatas of [
    [
      run(CHECK_COMPLETO, 10, "skipped", "2026-11-17T10:00:00Z"),
      run(CHECK_COMPLETO, 11, "success", "2026-11-17T09:00:00Z"),
    ],
    [
      run(CHECK_COMPLETO, 11, "success", "2026-11-17T09:00:00Z"),
      run(CHECK_COMPLETO, 10, "skipped", "2026-11-17T10:00:00Z"),
    ],
    [
      run(CHECK_COMPLETO, 12, "neutral", "2026-11-17T10:00:00Z"),
      run(CHECK_COMPLETO, 11, "success", "2026-11-17T09:00:00Z"),
    ],
  ]) {
    const veredito = avaliar({
      headSha: SHA,
      estado: "open",
      checkRuns: [...duplicatas, check(CHECK_AGREGADO), check(CHECK_VISUAL)],
    })
    assert.equal(veredito.ok, true)
    assert.match(veredito.motivo, /runs 11/)
  }
})

test("run vermelho mais recente vence run verde antigo e recusa", () => {
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    checkRuns: [
      run(CHECK_COMPLETO, 20, "success", "2026-11-17T09:00:00Z"),
      run(CHECK_COMPLETO, 21, "failure", "2026-11-17T10:00:00Z"),
      check(CHECK_AGREGADO),
      check(CHECK_VISUAL),
    ],
  })
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /failure.*run 21/)
})

test("somente run pulado não prova o completo", () => {
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    checkRuns: [
      run(CHECK_COMPLETO, 30, "skipped", "2026-11-17T10:00:00Z"),
      check(CHECK_AGREGADO),
      check(CHECK_VISUAL),
    ],
  })
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /skipped.*run 30/)
})

test("obter token usa ambiente antes do gh e injeta chamada sem shell", () => {
  let chamada
  assert.equal(
    obterToken({
      env: {},
      execFileSyncImpl: (...args) => {
        chamada = args
        return " gh-token\n"
      },
    }),
    "gh-token",
  )
  assert.deepEqual(chamada, [
    "gh",
    ["auth", "token"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ])
  assert.equal(
    obterToken({ env: { GH_TOKEN: "env-token" }, execFileSyncImpl: () => assert.fail() }),
    "env-token",
  )
  assert.throws(
    () =>
      obterToken({
        env: {},
        execFileSyncImpl: () => {
          throw new Error("not logged in")
        },
      }),
    /gh auth login/,
  )
})
