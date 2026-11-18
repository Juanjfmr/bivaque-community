import assert from "node:assert/strict"
import test from "node:test"
import {
  avaliar,
  CHECK_AGREGADO,
  CHECK_COMPLETO,
  CHECK_RAPIDO,
  CHECK_VISUAL,
  mergeSeguro,
  obterToken,
} from "../../scripts/agents/merge-seguro.mjs"

// SHA completo de 40 hex: o script recusa atalho justamente porque o merge precisa
// ser amarrado ao commit conferido.
const SHA = "0123456789abcdef0123456789abcdef01234567"
const OUTRO_SHA = "fedcba9876543210fedcba9876543210fedcba98"

const check = (
  name,
  { status = "completed", conclusion = "success", headSha = SHA, suite = "800" } = {},
) => ({
  name,
  status,
  conclusion,
  head_sha: headSha,
  check_suite: { id: suite },
})

const run = (name, id, conclusion, completed_at) => ({
  ...check(name, { conclusion }),
  id,
  completed_at,
})

// Um check de uma execução de workflow identificada: é o check_suite.id que agrupa.
const emSuite = (
  name,
  idSuite,
  { id, status = "completed", conclusion = "success", completedAt } = {},
) => ({
  ...check(name, { status, conclusion }),
  id,
  completed_at: completedAt,
  check_suite: { id: idSuite },
})

// A API real manda `link` no cabeçalho; a paginação depende dele.
function resposta(corpo, { ok = true, status = 200, link = null } = {}) {
  return {
    ok,
    status,
    headers: { get: (nome) => (nome.toLowerCase() === "link" ? link : null) },
    text: async () => JSON.stringify(corpo),
  }
}

/**
 * API simulada: responde pull, arquivos, check-runs e o merge, e guarda as
 * chamadas para que o teste possa provar que não houve PUT quando a recusa vale.
 * `paginas`, quando existe, substitui a resposta de check-runs página a página.
 */
function apiFalsa({
  estado = "open",
  headSha = SHA,
  arquivos = [],
  checkRuns = [],
  paginas = null,
  merge = { merged: true, sha: OUTRO_SHA },
} = {}) {
  const chamadas = []
  const fetchImpl = async (url, opcoes = {}) => {
    const metodo = opcoes.method ?? "GET"
    chamadas.push({ url, metodo, corpo: opcoes.body })
    if (url.includes("/files")) return resposta(arquivos.map((filename) => ({ filename })))
    if (url.includes("/check-runs")) {
      if (paginas) {
        const numero = Number(new URL(url).searchParams.get("page"))
        const { itens, temProxima } = paginas(numero)
        return resposta(
          { total_count: itens.length, check_runs: itens },
          {
            link: temProxima
              ? `<https://api.github.com/repos/bivaque/community/commits/${headSha}/check-runs?page=${numero + 1}>; rel="next"`
              : null,
          },
        )
      }
      return resposta({ total_count: checkRuns.length, check_runs: checkRuns })
    }
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
  // Given a PR outside apps/app (web and database), where the visual workflow's paths filter never fires
  const { veredito, api } = await rodar({
    arquivos: ["apps/web/lib/exemplo.ts", "supabase/migrations/exemplo.sql"],
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
    arquivos: ["apps/web/lib/exemplo.ts"],
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

// Uma execução mais nova que ainda não terminou não pode ser escondida por um verde antigo.
test("execução mais recente com o ci-core em andamento recusa, mesmo com outra verde", () => {
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: ["apps/app/src/main.tsx"],
    checkRuns: [
      emSuite(CHECK_COMPLETO, "100", { id: 1010 }),
      emSuite(CHECK_AGREGADO, "100", { id: 1011 }),
      emSuite(CHECK_VISUAL, "900", { id: 9010 }),
      emSuite(CHECK_COMPLETO, "200", { id: 2020, status: "in_progress", conclusion: null }),
      emSuite(CHECK_AGREGADO, "200", { id: 2021, status: "queued", conclusion: null }),
    ],
  })
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /execução em andamento/)
  assert.match(veredito.motivo, /suíte 200/)
  assert.match(veredito.motivo, /run 2020/)
})

test("execução mais recente com o agregador em andamento recusa, mesmo com o ci-core verde", () => {
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: ["apps/app/src/main.tsx"],
    checkRuns: [
      emSuite(CHECK_COMPLETO, "100", { id: 1010 }),
      emSuite(CHECK_AGREGADO, "100", { id: 1011 }),
      emSuite(CHECK_VISUAL, "900", { id: 9010 }),
      emSuite(CHECK_COMPLETO, "200", { id: 2020 }),
      emSuite(CHECK_AGREGADO, "200", { id: 2021, status: "in_progress", conclusion: null }),
    ],
  })
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /execução em andamento/)
  assert.match(veredito.motivo, /suíte 200/)
  assert.match(veredito.motivo, /run 2021/)
})

test("Visual Smoke em andamento recusa, mesmo com outro Visual verde", () => {
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: ["apps/app/src/main.tsx"],
    checkRuns: [
      emSuite(CHECK_COMPLETO, "100", { id: 1010 }),
      emSuite(CHECK_AGREGADO, "100", { id: 1011 }),
      emSuite(CHECK_VISUAL, "900", { id: 9010 }),
      emSuite(CHECK_VISUAL, "901", { id: 9011, status: "in_progress", conclusion: null }),
    ],
  })
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /Visual Smoke ainda está "in_progress"/)
  assert.match(veredito.motivo, /run 9011/)
})

test("run cancelado ou expirado mais recente, sem completed_at, vence o verde antigo e recusa", () => {
  for (const conclusao of ["cancelled", "timed_out"]) {
    const veredito = avaliar({
      headSha: SHA,
      estado: "open",
      arquivos: ["apps/app/src/main.tsx"],
      checkRuns: [
        // verde antigo, com data de conclusão
        emSuite(CHECK_COMPLETO, "100", { id: 1010, completedAt: "2026-11-17T09:00:00Z" }),
        emSuite(CHECK_AGREGADO, "100", { id: 1011, completedAt: "2026-11-17T09:05:00Z" }),
        emSuite(CHECK_VISUAL, "900", { id: 9010, completedAt: "2026-11-17T09:06:00Z" }),
        // execução mais nova, sem data: não pode perder para o verde velho
        emSuite(CHECK_COMPLETO, "200", { id: 2020, conclusion: conclusao }),
        emSuite(CHECK_AGREGADO, "200", { id: 2021 }),
      ],
    })
    assert.equal(veredito.ok, false)
    assert.match(veredito.motivo, new RegExp(`${conclusao}.*run 2020`))
  }
})

test("ci-core de uma execução não se combina com o agregador de outra", () => {
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: ["apps/app/src/main.tsx"],
    checkRuns: [
      // execução A: ci-core verde, agregador vermelho
      emSuite(CHECK_COMPLETO, "100", { id: 1010 }),
      emSuite(CHECK_AGREGADO, "100", { id: 1011, conclusion: "failure" }),
      // execução B: ci-core pulado, agregador verde — não roda o rito
      emSuite(CHECK_COMPLETO, "50", { id: 510, conclusion: "skipped" }),
      emSuite(CHECK_AGREGADO, "50", { id: 511 }),
      emSuite(CHECK_VISUAL, "900", { id: 9010 }),
    ],
  })
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /"failure"/)
  assert.match(veredito.motivo, /suíte 100/)
  assert.match(veredito.motivo, /run 1011/)
})

test("id de suíte acima de 2^53 decide pelo mais recente, como BigInt", () => {
  const base = (idSuite, { id, conclusion = "success" }) => [
    emSuite(CHECK_COMPLETO, idSuite, { id, conclusion }),
    emSuite(CHECK_AGREGADO, idSuite, { id: id + 1 }),
  ]

  // Os dois ids viram o mesmo Number: comparados por Number, o vermelho mais novo
  // passaria como se fosse a execução verde antiga.
  const recusa = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: ["apps/app/src/main.tsx"],
    checkRuns: [
      ...base("9007199254740992", { id: 1 }),
      ...base("9007199254740993", { id: 3, conclusion: "failure" }),
      emSuite(CHECK_VISUAL, "9007199254740994", { id: 9 }),
    ],
  })
  assert.equal(recusa.ok, false)
  assert.match(recusa.motivo, /"failure"/)
  assert.match(recusa.motivo, /suíte 9007199254740993/)
  assert.match(recusa.motivo, /run 3/)

  // E o mais novo continua ganhando quando é ele o verde.
  const passa = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: ["apps/app/src/main.tsx"],
    checkRuns: [
      ...base("9007199254740992", { id: 1, conclusion: "failure" }),
      ...base("9007199254740993", { id: 3 }),
      emSuite(CHECK_VISUAL, "9007199254740994", { id: 9 }),
    ],
  })
  assert.equal(passa.ok, true)
  assert.match(passa.motivo, /suíte 9007199254740993/)
})

test("duas execuções sem id de suíte: recusa por falta de id de execução", () => {
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: ["apps/web/lib/exemplo.ts"],
    checkRuns: [
      emSuite(CHECK_COMPLETO, "100", { id: 1010 }),
      emSuite(CHECK_AGREGADO, "100", { id: 1011 }),
      emSuite(CHECK_COMPLETO, undefined, { id: 2010 }),
      emSuite(CHECK_AGREGADO, undefined, { id: 2011 }),
    ],
  })
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /sem id de suíte/)
  assert.match(veredito.motivo, /2010/)
})

test("GH_TOKEN vazio conta como ausente e cede para GITHUB_TOKEN", () => {
  assert.equal(
    obterToken({
      env: { GH_TOKEN: "", GITHUB_TOKEN: "outro-token" },
      execFileSyncImpl: () => assert.fail("não deveria chamar o gh"),
    }),
    "outro-token",
  )
  assert.equal(
    obterToken({
      env: { GH_TOKEN: "", GITHUB_TOKEN: "" },
      execFileSyncImpl: () => "do-gh\n",
    }),
    "do-gh",
  )
})

test("consulta todos os runs do SHA, não só o mais novo de cada nome", async () => {
  const { api } = await rodar({
    arquivos: ["apps/web/lib/exemplo.ts"],
    checkRuns: [check(CHECK_COMPLETO), check(CHECK_AGREGADO)],
  })
  const chamada = api.chamadas.find((c) => c.url.includes("/check-runs"))
  assert.match(chamada.url, /filter=all/)
})

// Sem id de execução não há agrupamento possível: o ci-core verde de uma execução
// não pode emprestar aprovação ao agregador verde de outra.
test("checks do rito sem id de suíte: recusa, mesmo com ci-core verde numa execução e agregador verde em outra", () => {
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: ["apps/web/lib/exemplo.ts"],
    checkRuns: [
      { ...check(CHECK_COMPLETO), id: 3010, check_suite: undefined },
      { ...check(CHECK_AGREGADO), id: 3011, check_suite: undefined },
    ],
  })
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /check sem id de execução/)
  assert.match(veredito.motivo, /run 3010/)
})

// A execução mais nova decide mesmo sem ci-core: pular para a antiga verde
// esconderia o run novo, que é o que o rito pediu.
test("execução mais nova com ci-core pulado e agregador verde recusa, ainda que a antiga esteja toda verde", () => {
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: ["apps/app/src/main.tsx"],
    checkRuns: [
      emSuite(CHECK_COMPLETO, "100", { id: 1010 }),
      emSuite(CHECK_AGREGADO, "100", { id: 1011 }),
      emSuite(CHECK_VISUAL, "900", { id: 9010 }),
      emSuite(CHECK_COMPLETO, "200", { id: 2020, conclusion: "skipped" }),
      emSuite(CHECK_AGREGADO, "200", { id: 2021 }),
    ],
  })
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /"skipped"/)
  assert.match(veredito.motivo, /suíte 200/)
  assert.match(veredito.motivo, /run 2020/)
})

// Revisão 3: id numérico acima de 2^53 chega arredondado do JSON; dois ids
// diferentes viram o mesmo e misturariam execuções. Tem de recusar.
test("ids de suíte numéricos acima de 2^53 recusam em vez de misturar execuções", () => {
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: ["apps/web/lib/exemplo.ts"],
    checkRuns: [
      { ...check(CHECK_COMPLETO), id: 1, check_suite: JSON.parse('{"id":9007199254740992}') },
      { ...check(CHECK_AGREGADO), id: 2, check_suite: JSON.parse('{"id":9007199254740992}') },
      { ...check(CHECK_AGREGADO), id: 3, check_suite: JSON.parse('{"id":9007199254740993}') },
    ],
  })
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /check sem id de execução/)
})

// Revisão 3: a execução mais nova sem ci-core nenhum (não só pulado) também decide.
test("execução mais nova sem ci-core e com agregador verde recusa, ainda que a antiga esteja toda verde", () => {
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: ["apps/web/lib/exemplo.ts"],
    checkRuns: [
      emSuite(CHECK_COMPLETO, "100", { id: 1010 }),
      emSuite(CHECK_AGREGADO, "100", { id: 1011 }),
      emSuite(CHECK_AGREGADO, "200", { id: 2021 }),
    ],
  })
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /suíte 200/)
})

// O caso real do PR #273: suíte antiga toda cancelada, agregador vermelho, suíte
// mais nova toda verde — vale a mais nova.
test("PR #273: suíte antiga cancelada com agregador vermelho perde para a suíte mais nova verde", () => {
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: ["apps/web/lib/exemplo.ts"],
    checkRuns: [
      emSuite(CHECK_COMPLETO, "100", { id: 1010, conclusion: "cancelled" }),
      emSuite(CHECK_AGREGADO, "100", { id: 1011, conclusion: "failure" }),
      emSuite(CHECK_COMPLETO, "200", { id: 2020 }),
      emSuite(CHECK_AGREGADO, "200", { id: 2021 }),
    ],
  })
  assert.equal(veredito.ok, true)
  assert.match(veredito.motivo, /suíte 200/)
  assert.match(veredito.motivo, /2020/)
})

test("paginação esgotada com a última página cheia recusa em vez de decidir com lista truncada", async () => {
  const api = apiFalsa({
    arquivos: ["apps/web/lib/exemplo.ts"],
    paginas: () => ({
      itens: Array.from({ length: 100 }, (_, indice) => ({
        ...check("Outro check"),
        id: 100000 + indice,
      })),
      temProxima: true,
    }),
  })
  await assert.rejects(
    mergeSeguro({ pr: 7, repo: "bivaque/community", token: "escopo", fetchImpl: api.fetchImpl }),
    /páginas/,
  )
  assert.equal(api.merges().length, 0)
})

test("veredito do Visual nomeia a suíte e o run do Visual, na recusa e no sucesso", () => {
  const recusa = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: ["apps/app/src/main.tsx"],
    checkRuns: [
      emSuite(CHECK_COMPLETO, "100", { id: 1010 }),
      emSuite(CHECK_AGREGADO, "100", { id: 1011 }),
      emSuite(CHECK_VISUAL, "900", { id: 9010, conclusion: "failure" }),
    ],
  })
  assert.equal(recusa.ok, false)
  assert.match(recusa.motivo, /suíte 900, run 9010/)

  const sucesso = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: ["apps/app/src/main.tsx"],
    checkRuns: [
      emSuite(CHECK_COMPLETO, "100", { id: 1010 }),
      emSuite(CHECK_AGREGADO, "100", { id: 1011 }),
      emSuite(CHECK_VISUAL, "900", { id: 9010 }),
    ],
  })
  assert.equal(sucesso.ok, true)
  assert.match(sucesso.motivo, /suíte 100, runs 1010, 1011/)
  assert.match(sucesso.motivo, /Visual suíte 900, run 9010/)
})

test("paginação cheia continua na página seguinte até achar o fim", async () => {
  const { veredito, api } = await rodar({
    arquivos: ["apps/web/lib/exemplo.ts"],
    paginas: (pagina) =>
      pagina === 1
        ? {
            itens: Array.from({ length: 100 }, (_, indice) => ({
              ...check("Outro check"),
              id: 200000 + indice,
            })),
            temProxima: true,
          }
        : { itens: [check(CHECK_COMPLETO), check(CHECK_AGREGADO)], temProxima: false },
  })
  assert.equal(veredito.ok, true)
  const urls = api.chamadas.filter((c) => c.url.includes("/check-runs")).map((c) => c.url)
  assert.equal(urls.length, 2)
  assert.match(urls[1], /page=2/)
})

// PR leve (scripts/ci/pr-leve.mjs): o workflow pula o ci-core e o agregador sai verde
// com o fast. A trava aceita o mesmo, e só quando TODOS os arquivos são leves.
const QUADRO = ["tools/backend-kanban/public/board.json", "tools/backend-kanban/BOARD.md"]

test("PR leve: fast e agregador verdes mergeiam sem o ci-core", async () => {
  // Given a board-only PR whose run skipped ci-core
  const { veredito, api } = await rodar({
    arquivos: [...QUADRO, "docs/decisions/RATIFICACAO.md"],
    checkRuns: [
      check(CHECK_RAPIDO),
      check(CHECK_COMPLETO, { conclusion: "skipped" }),
      check(CHECK_AGREGADO),
    ],
  })

  // Then the merge goes through and the reason says it was the light path
  assert.equal(veredito.ok, true)
  assert.equal(veredito.merged, true)
  assert.match(veredito.motivo, /PR leve/)
  assert.equal(api.merges().length, 1)
})

test("PR leve com fast vermelho: recusa", () => {
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: QUADRO,
    checkRuns: [check(CHECK_RAPIDO, { conclusion: "failure" }), check(CHECK_AGREGADO)],
  })
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /Fast checks/)
})

test("PR leve sem agregador: recusa como completo ausente", () => {
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: QUADRO,
    checkRuns: [check(CHECK_RAPIDO)],
  })
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /ci:full/)
})

test("PR leve com fast em andamento: recusa", () => {
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: QUADRO,
    checkRuns: [
      check(CHECK_RAPIDO, { status: "in_progress", conclusion: null }),
      check(CHECK_AGREGADO, { status: "queued", conclusion: null }),
    ],
  })
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /ainda está/)
})

test("um arquivo de código no meio do quadro exige o completo", () => {
  // Given a mostly-board PR that also touches a migration, with only the light run
  const veredito = avaliar({
    headSha: SHA,
    estado: "open",
    arquivos: [...QUADRO, "supabase/migrations/20261118000000_x.sql"],
    checkRuns: [
      check(CHECK_RAPIDO),
      check(CHECK_COMPLETO, { conclusion: "skipped" }),
      check(CHECK_AGREGADO),
    ],
  })

  // Then the light path does not apply and the skipped ci-core refuses
  assert.equal(veredito.ok, false)
  assert.match(veredito.motivo, /"skipped"/)
})

test("renomear código para docs não é leve: o nome antigo conta", async () => {
  // Given a PR that moves a source file into docs/
  const api = apiFalsa({
    checkRuns: [
      check(CHECK_RAPIDO),
      check(CHECK_COMPLETO, { conclusion: "skipped" }),
      check(CHECK_AGREGADO),
    ],
  })
  const fetchImpl = async (url, opcoes) =>
    url.includes("/files")
      ? resposta([{ filename: "docs/velho.ts", previous_filename: "apps/web/lib/velho.ts" }])
      : api.fetchImpl(url, opcoes)

  const veredito = await mergeSeguro({ pr: 7, repo: "bivaque/community", token: "t", fetchImpl })

  // Then it is judged as code and refused without the full run
  assert.equal(veredito.ok, false)
  assert.equal(api.merges().length, 0)
})
