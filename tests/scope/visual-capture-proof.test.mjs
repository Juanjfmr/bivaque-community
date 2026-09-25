import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  assessCapture,
  DYNAMIC_HEADING,
  isCaptureReportPassing,
  summarizeCaptures,
} from "../../scripts/visual/capture-proof.mjs"
import { captureVerdict } from "../../scripts/visual/capture-verdict.mjs"

const sample = () => ({
  route: {
    path: "/admissions",
    auth: true,
    operator: true,
    expectedHeading: "^Fila de admissões$",
  },
  authenticated: true,
  status: 200,
  landedOn: "/admissions",
  observed: { heading: "Fila de admissões", operator: true, fallback: false, pageErrors: 0 },
})

test("valid operator capture needs session, route, heading and actor surface", () => {
  assert.equal(assessCapture(sample()).valid, true)
  for (const change of [
    { authenticated: false },
    { status: 403 },
    { status: 500 },
    { status: 0 },
    { landedOn: "/login?return=/admissions" },
    { landedOn: "/community" },
    { observed: { ...sample().observed, heading: "Entrar" } },
    { observed: { ...sample().observed, operator: false } },
    { observed: { ...sample().observed, fallback: true } },
    { observed: { ...sample().observed, pageErrors: 1 } },
    { error: "Timed out" },
  ])
    assert.equal(assessCapture({ ...sample(), ...change }).valid, false, JSON.stringify(change))
})

test("HTTP 200 fallback and a closed or different dialog are not valid state evidence", () => {
  const state = { ...sample(), route: { ...sample().route, dialog: "Criar publicação" } }
  assert.equal(assessCapture(state).valid, false)
  assert.equal(
    assessCapture({ ...state, observed: { ...state.observed, dialog: "Outra" } }).valid,
    false,
  )
  assert.equal(
    assessCapture({ ...state, observed: { ...state.observed, dialog: "Criar publicação" } }).valid,
    true,
  )
})

test("a rota com marcadores de estado não aceita a tela de diretório", () => {
  const state = {
    ...sample(),
    route: {
      ...sample().route,
      path: "/guide/entry",
      requiredText: ["Neste guia", "Origem desta referência"],
    },
    landedOn: "/guide/entry",
    observed: { ...sample().observed, missingRequiredText: ["Neste guia"] },
  }
  assert.equal(assessCapture(state).valid, false)
  state.observed.missingRequiredText = []
  assert.equal(assessCapture(state).valid, true)
})

test("public captures are explicit; missing identity contract fails closed", () => {
  const state = {
    ...sample(),
    authenticated: false,
    route: { path: "/login", auth: false, expectedHeading: "Entrar" },
    landedOn: "/login",
    observed: { heading: "Entrar" },
  }
  assert.equal(assessCapture(state).valid, true)
  assert.equal(assessCapture({ ...state, route: { path: "/login", auth: false } }).valid, false)
})

test("zero findings cannot pass an empty, failed, partial or legacy report", () => {
  const entry = { proof: assessCapture(sample()), findings: [] }
  const report = { ...summarizeCaptures([entry]), results: [entry] }
  assert.equal(isCaptureReportPassing(report), true)
  for (const results of [[], [{ error: "timeout", findings: [] }], [entry, { findings: [] }]]) {
    assert.equal(isCaptureReportPassing({ ...summarizeCaptures(results), results }), false)
  }
  assert.equal(isCaptureReportPassing({ high: 0, results: [entry] }), false)
  assert.equal(
    isCaptureReportPassing({
      ...report,
      results: [{ ...entry, findings: [{ severity: "high" }] }],
    }),
    false,
  )
})

test("a data-named route has an identity contract, but still needs a real heading", () => {
  const dynamic = {
    ...sample(),
    route: { ...sample().route, expectedHeading: DYNAMIC_HEADING },
    observed: { ...sample().observed, heading: "Jardim das Acácias" },
  }
  assert.equal(assessCapture(dynamic).valid, true)
  for (const heading of [null, "", "   "]) {
    const blank = assessCapture({ ...dynamic, observed: { ...dynamic.observed, heading } })
    assert.equal(blank.valid, false, JSON.stringify(heading))
    assert.ok(blank.failures.some((f) => /rendered no heading/.test(f)))
  }
  // The sentinel relaxes the TEXT, never the actor, the destination or the state.
  for (const change of [
    { landedOn: "/login?return=/admissions" },
    { observed: { ...dynamic.observed, operator: false } },
    { observed: { ...dynamic.observed, fallback: true } },
    { authenticated: false },
  ])
    assert.equal(assessCapture({ ...dynamic, ...change }).valid, false, JSON.stringify(change))
})

test("every captured route declares an identity contract, and none is orphaned", async () => {
  const { ROUTES, HEADINGS } = await import("../../scripts/visual/capture.mjs")
  const paths = [...new Set(ROUTES.map((route) => route.path))]
  // Undeclared routes made a full loop run permanently red for reasons that had
  // nothing to do with the screen being worked on. Failing here instead says
  // exactly which route is missing, in milliseconds, before anyone opens a browser.
  const undeclared = paths.filter((path) => !(path in HEADINGS))
  assert.deepEqual(undeclared, [], `Routes with no identity contract: ${undeclared.join(", ")}`)
  const orphaned = Object.keys(HEADINGS).filter((path) => !paths.includes(path))
  assert.deepEqual(orphaned, [], `Identity contracts for no route: ${orphaned.join(", ")}`)
  for (const [path, heading] of Object.entries(HEADINGS)) {
    assert.equal(typeof heading, "string", path)
    assert.ok(heading.length > 0, path)
    if (heading !== DYNAMIC_HEADING) assert.doesNotThrow(() => new RegExp(heading), path)
  }
})

test("owner-only captures use the seeded owning account", async () => {
  const { ROUTES, SEED_ACCOUNTS } = await import("../../scripts/visual/capture.mjs")
  const accountFor = (path) => ROUTES.find((route) => route.path === path)?.account
  assert.equal(SEED_ACCOUNTS.donoVila, "dono-vila@bivaque.example.invalid")
  for (const path of [
    "/communities/71000000-0000-4000-8000-000000000001/admin/media",
    "/communities/71000000-0000-4000-8000-000000000001/admin/pending",
    "/events/70000000-0000-4000-8000-0000000000a1/editar",
  ]) {
    assert.equal(accountFor(path), "donoVila", path)
  }
  assert.equal(accountFor("/prestadores/30000000-0000-4000-8000-000000000010"), "membro1")
  assert.equal(
    accountFor("/pedidos/novo?prestador=30000000-0000-4000-8000-000000000010"),
    "membro1",
  )
})

test("rotas com o mesmo path preservam atores diferentes", async () => {
  const { ROUTES } = await import("../../scripts/visual/capture.mjs")
  const member = ROUTES.find((route) => route.name === "communities-member")
  const pending = ROUTES.find((route) => route.name === "communities-pending")
  assert.equal(member?.account, "membro1")
  assert.equal(pending?.account, "pendingCommunity")
})

test("a captura de acesso negado declara ator, estado e fluxo", async () => {
  const { ROUTES } = await import("../../scripts/visual/capture.mjs")
  const route = ROUTES.find((item) => item.name === "community-outsider")
  assert.equal(route?.account, "membro1")
  assert.equal(route?.state, "denied")
  assert.equal(route?.flow, "direct-route")
  assert.deepEqual(route?.requiredText, ["Você ainda não tem acesso", "Trocar de cidade"])
})

test("both proof writers record whether the tree was dirty", () => {
  // A report that names only the commit attributes the evidence to code the
  // commit does not contain whenever the work is still uncommitted.
  for (const script of ["scripts/visual/capture.mjs", "scripts/visual/operation-proof.mjs"]) {
    const source = readFileSync(script, "utf8")
    assert.match(source, /"status",\s*"--porcelain"/, script)
    assert.match(source, /dirty/i, script)
  }
})

// Comparador: falha FECHADA. Só `proof.valid === true` concorre a verde.

test("comparador: captura sem prova não vira 'mecanicamente ok'", () => {
  assert.equal(captureVerdict({ data: { total: 0, high: 0 } }).kind, "unproven")
  assert.equal(captureVerdict({ proof: null, data: { total: 0, high: 0 } }).kind, "unproven")
  assert.equal(captureVerdict({ proof: {}, data: { total: 0, high: 0 } }).kind, "unproven")
})

test("comparador: prova inválida e achados continuam vermelhos", () => {
  assert.equal(captureVerdict({ proof: { valid: false }, data: {} }).kind, "invalid")
  assert.equal(captureVerdict({ proof: { valid: true }, data: { high: 2, total: 3 } }).kind, "high")
  assert.equal(captureVerdict({ proof: { valid: true }, data: { total: 1 } }).kind, "findings")
})

test("comparador: só prova válida sem achado é 'mecanicamente ok'", () => {
  assert.deepEqual(captureVerdict({ proof: { valid: true }, data: { total: 0, high: 0 } }), {
    kind: "ok",
    label: "mecanicamente ok",
  })
})
