import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

const scanner = join(import.meta.dirname, "..", "secrets-scan.mjs")

// Runs the real scanner against a throwaway repository holding one document.
function scanDocument(content) {
  const dir = mkdtempSync(join(tmpdir(), "secrets-figma-"))
  try {
    mkdirSync(join(dir, "tests"))
    copyFileSync(scanner, join(dir, "tests", "secrets-scan.mjs"))
    writeFileSync(join(dir, "doc.md"), content)
    spawnSync("git", ["init", "-q"], { cwd: dir })
    spawnSync("git", ["add", "-A"], { cwd: dir })
    return spawnSync("node", ["tests/secrets-scan.mjs"], { cwd: dir, encoding: "utf8" })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const fileKey = ["niuOHiHk", "yc9eGaIQ", "BY9hq4"].join("")
const fakeToken = `Zq9${"x7Kp".repeat(10)}`

test("a figma.com design link does not count as a secret", () => {
  // Given a document citing a Figma frame by its design URL
  const result = scanDocument(
    `[Inicio](https://www.figma.com/design/${fileKey}/Bivaque?node-id=9-5)\n`,
  )

  // Then the scanner passes
  assert.equal(result.status, 0, result.stderr)
})

test("a token on the same line as a figma link is still flagged", () => {
  // Given a Figma link followed by a pasted token
  const result = scanDocument(`https://www.figma.com/design/${fileKey}/Bivaque ${fakeToken}\n`)

  // Then the scanner fails on the token
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Generic base64/)
})

test("the same path without the figma.com host is still flagged", () => {
  // Given the design path shape on another host
  const result = scanDocument(`https://example.com/design/${fakeToken}/Bivaque\n`)

  // Then the scanner fails
  assert.equal(result.status, 1)
})
