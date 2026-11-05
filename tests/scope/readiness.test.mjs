import assert from "node:assert/strict"
import test from "node:test"
import { buildReadiness, validateLaunch } from "../../tools/backend-kanban/src/readiness-lib.mjs"

const revision = "a".repeat(40)
function fixture() {
  return {
    updatedAt: "2026-11-05",
    cards: [
      { id: "FLOW", title: "Entrada", status: "done", proof: ["revisão"], dependencies: [] },
      { id: "BE", title: "Servidor", status: "done", proof: ["teste"], dependencies: [] },
      { id: "LEGAL", title: "Revisão legal", status: "blocked", blockers: ["revisão pendente"] },
    ],
    launch: {
      version: "2026-11-05",
      title: "Lançamento Web",
      source: "docs/LANCAMENTO.md",
      gates: ["LEGAL"],
      journeys: [
        {
          id: "F01",
          title: "Entrada",
          cardId: "FLOW",
          nextStep: "Comprovar entrada",
          frontend: ["FLOW"],
          backend: ["BE"],
        },
      ],
    },
  }
}
function evidence() {
  const acceptance = Object.fromEntries(
    ["frontend", "backend", "integration"].map((layer) => [
      layer,
      {
        revision,
        scopeVersion: "2026-11-05",
        proof: ["docs/evidence/revisao.md"],
      },
    ]),
  )
  return {
    ...fixture(),
    cards: fixture().cards.map((c) => (c.id === "FLOW" ? { ...c, acceptance } : c)),
  }
}
function context() {
  return {
    revision,
    generatedAt: "2026-11-05T12:00:00Z",
    checks: {
      frontend: { status: "success", revision },
      backend: { status: "success", revision },
      integration: { status: "success", revision },
    },
    unchanged: {},
    evidenceValid: {
      "F01:frontend": true,
      "F01:backend": true,
      "F01:integration": true,
      "LEGAL:integration": true,
    },
    production: null,
  }
}

test("done histórico e CI verde não inventam comprovação de produto", () => {
  const result = buildReadiness(fixture(), context())
  assert.equal(result.metrics.integration.percent, 0)
  assert.equal(result.metrics.backend.declared, 1)
  assert.equal(result.provisional, true)
  assert.equal(result.stage, "Em validação")
})

test("camadas têm denominadores próprios e geral não é média", () => {
  const board = evidence()
  board.cards[0].acceptance.integration = undefined
  const result = buildReadiness(board, context())
  assert.equal(result.metrics.frontend.percent, 100)
  assert.equal(result.metrics.backend.percent, 100)
  assert.equal(result.metrics.integration.percent, 0)
  assert.equal(result.remaining, 1)
})

test("versão diferente não herda prova sem conferência dos caminhos", () => {
  const board = evidence()
  board.cards[0].acceptance.frontend.revision = "b".repeat(40)
  assert.equal(buildReadiness(board, context()).metrics.frontend.percent, 0)
  const input = context()
  input.unchanged["F01:frontend"] = true
  assert.equal(buildReadiness(board, input).metrics.frontend.percent, 100)
  input.checks.frontend.revision = "c".repeat(40)
  assert.equal(buildReadiness(board, input).metrics.frontend.percent, 0)
})

test("falha, cancelamento e testes ignorados nunca contam como comprovado", () => {
  for (const status of ["failure", "skipped", "inconclusive", "pending"]) {
    const input = context()
    input.checks.backend.status = status
    const result = buildReadiness(evidence(), input)
    assert.equal(result.metrics.backend.verified, 0)
    assert.equal(result.metrics.integration.verified, 0)
    assert.equal(result.journeys[0].backend.status, status === "failure" ? "failed" : "unverified")
  }
})

test("100% de jornadas não libera lançamento com requisitos gerais pendentes", () => {
  const result = buildReadiness(evidence(), context())
  assert.equal(result.metrics.integration.percent, 100)
  assert.equal(result.stage, "Aguardando requisitos de lançamento")
  assert.equal(result.gates[0].status, "blocked")
  assert.notEqual(result.stage, "Publicado e verificado")
})

test("resumo não publica provas livres, dados internos nem credenciais", () => {
  const board = evidence()
  board.cards[0].proof.push("PRIVATE-DATA-EXAMPLE")
  board.cards[0].acceptance.frontend.proof.push("PRIVATE-REFERENCE-EXAMPLE")
  const result = JSON.stringify(buildReadiness(board, context()))
  assert.doesNotMatch(result, /PRIVATE-DATA-EXAMPLE|PRIVATE-REFERENCE-EXAMPLE/)
  assert.equal(JSON.parse(result).journeys[0].frontend.evidenceCount, 2)
})

test("validação recusa escopo vazio, IDs duplicados e referências inexistentes", () => {
  assert.deepEqual(validateLaunch(fixture()), [])
  const empty = fixture()
  empty.launch.journeys = []
  assert.match(validateLaunch(empty).join(" "), /journeys/)
  const board = fixture()
  board.launch.journeys.push({ ...board.launch.journeys[0], backend: ["MISSING"] })
  assert.match(validateLaunch(board).join(" "), /duplicado/)
  assert.match(validateLaunch(board).join(" "), /MISSING/)
})

test("inventário vazio não produz NaN nem estágio pronto", () => {
  const board = fixture()
  board.launch.journeys = []
  assert.throws(() => buildReadiness(board, context()), /journeys/)
})

test("mudança de escopo exige novo aceite e requisitos completos permitem revisão final", () => {
  const board = evidence()
  board.launch.version = "2026-11-06"
  assert.equal(buildReadiness(board, context()).metrics.frontend.verified, 0)
  const ready = evidence()
  ready.cards[2] = {
    ...ready.cards[2],
    status: "done",
    proof: ["aceite"],
    acceptance: ready.cards[0].acceptance,
  }
  assert.equal(buildReadiness(ready, context()).stage, "Pronto para revisão de publicação")
})

test("condição geral sem referências é inválida e nunca libera revisão final", () => {
  const board = evidence()
  board.cards[2] = {
    ...board.cards[2],
    status: "done",
    proof: ["histórico"],
    acceptance: { integration: { revision, scopeVersion: board.launch.version } },
  }
  assert.match(validateLaunch(board).join(" "), /LEGAL.*referências/)
  assert.throws(() => buildReadiness(board, context()), /referências/)
})

test("frontend comprovado avança mesmo quando a jornada ainda está aberta", () => {
  const board = evidence()
  board.cards[0].status = "now"
  delete board.cards[0].acceptance.backend
  delete board.cards[0].acceptance.integration
  const result = buildReadiness(board, context())
  assert.equal(result.metrics.frontend.percent, 100)
  assert.equal(result.metrics.integration.percent, 0)
})

test("referência inexistente ou não conferida não comprova uma camada", () => {
  const input = context()
  input.evidenceValid["F01:frontend"] = false
  assert.equal(buildReadiness(evidence(), input).metrics.frontend.percent, 0)
  delete input.evidenceValid
  assert.equal(buildReadiness(evidence(), input).metrics.frontend.percent, 0)
})

test("aceite de camada não supera drift explicitamente aberto no card", () => {
  const board = evidence()
  board.cards[0].status = "now"
  board.cards[0].drift = { documented: "completo", observed: "falha atual", action: "corrigir" }
  const result = buildReadiness(board, context())
  assert.equal(result.metrics.frontend.verified, 0)
  assert.equal(result.metrics.backend.verified, 0)
})
