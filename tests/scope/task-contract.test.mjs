import assert from "node:assert/strict"
import test from "node:test"
import { checkSource } from "../../scripts/agents/task-contract.mjs"

const validContract = [
  "task_id: HRN-999",
  "objective: Validar os coment?rios em contratos",
  "authority:",
  "  - teste",
  "baseline:",
  "  status: NOT-APPLICABLE",
  "allowed_paths:",
  "  - docs/test.md",
  "forbidden:",
  "  - nada",
  "acceptance:",
  "  - coment?rio ignorado",
  "proof:",
  "  - node --test",
  "risk: harness",
  "risk_level: R0",
  "reviewer_must_differ_from_executor: false",
  "closure:",
  "  requires_runtime_evidence: false",
  "",
].join("\n")

test("accepts full-line comments beginning with backticks or parentheses", () => {
  for (const comment of ["# `coment?rio`", "# (coment?rio)"]) {
    const result = checkSource(`${comment}\n${validContract}`)
    assert.equal(result.valid, true, result.errors.join(" | "))
  }
})

test("continues refusing an invalid key after a full-line comment", () => {
  const result = checkSource(`# (coment?rio)\nchave invalida valor\n${validContract}`)
  assert.equal(result.valid, false)
  assert.match(result.errors.join(" | "), /esperava `chave: valor`/)
})
