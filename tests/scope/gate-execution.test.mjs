import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { runInNewContext } from "node:vm"

const source = readFileSync("scripts/gate.mjs", "utf8").replace(/^import .*$/gm, "")

function runGate(args = [], failure) {
  const calls = []
  let report
  let exitCode
  runInNewContext(source, {
    Date,
    process: {
      argv: ["node", "gate.mjs", "--json", ...args],
      stdout: { write() {} },
      exit(code) {
        exitCode = code
      },
    },
    console: {
      log(value) {
        report = JSON.parse(value)
      },
    },
    spawnSync(command, argv) {
      assert.equal(command, "npx")
      assert.equal(argv[0], "pnpm@11.18.0")
      calls.push(argv[1])
      return { status: argv[1] === failure ? 1 : 0, stdout: "", stderr: "" }
    },
  })
  return { calls, report, exitCode }
}

test("the full gate always builds and only passes after every check", () => {
  const { calls, report, exitCode } = runGate()
  assert.deepEqual(calls, ["lint", "typecheck", "build", "test", "test:secrets"])
  assert.equal(report.green, true)
  assert.equal(exitCode, 0)
})

test("a failed build stops the gate before tests and returns failure", () => {
  const { calls, report, exitCode } = runGate([], "build")
  assert.deepEqual(calls, ["lint", "typecheck", "build"])
  assert.equal(report.green, false)
  assert.equal(exitCode, 1)
})

test("fast checks can pass without claiming the full gate is green", () => {
  const { calls, report, exitCode } = runGate(["--fast"])
  assert.deepEqual(calls, ["lint", "typecheck"])
  assert.equal(report.green, false)
  assert.equal(report.passed, true)
  assert.equal(exitCode, 0)
})

test("a failed lint stops even the fast gate", () => {
  const { calls, report, exitCode } = runGate(["--fast"], "lint")
  assert.deepEqual(calls, ["lint"])
  assert.equal(report.passed, false)
  assert.equal(exitCode, 1)
})
