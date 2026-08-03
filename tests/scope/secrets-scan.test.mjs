import assert from "node:assert/strict"
import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = join(import.meta.dirname, "..", "..")

const readJson = (path) => JSON.parse(readFileSync(join(root, path), "utf8"))

test("exposes the test:secrets script in package.json", () => {
  // Given the root package manifest
  const rootPackage = readJson("package.json")

  // When the scripts are inspected
  const scripts = rootPackage.scripts

  // Then test:secrets points to the secrets scanner
  assert.equal(scripts["test:secrets"], "node tests/secrets-scan.mjs")
})

test("the secrets scanner script exists", () => {
  // Given the tests directory
  // When the scanner script is checked
  // Then it exists
  assert.equal(existsSync(join(root, "tests", "secrets-scan.mjs")), true)
})

test("the secrets scanner runs clean on the real repo", () => {
  // Given the repo with no committed secrets
  // When the secrets scanner runs
  const result = execSync("node tests/secrets-scan.mjs", {
    encoding: "utf8",
    cwd: root,
  })

  // Then the scanner exits clean and reports no findings
  assert.match(result, /passed|clean|no secrets/i)
})
