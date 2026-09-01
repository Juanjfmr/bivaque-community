import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

// D2 Task 3 Step 2: the scope guard that mechanizes the single-source rule for
// consent and code-of-conduct versions. The versions used to live as literals
// in five places (middleware, the consent page, the consent action, the
// onboarding route and the provision flow). Publishing a version 2 meant
// editing five files and the failure surfaced only as "consent is required"
// in production. The guard forbids any local declaration of these constants in
// executable code under apps/web/app or apps/web/lib, so the next agent cannot
// reintroduce the literal in fifteen seconds.

const root = join(import.meta.dirname, "..", "..")
const SCAN_ROOTS = [join(root, "apps", "web", "app"), join(root, "apps", "web", "lib")]

// Local declarations of consent version constants under the scan roots.
const FORBIDDEN_LOCAL =
  /(?:const|let|var)\s+(CURRENT_CONSENT_VERSION|CONSENT_VERSION|CODE_OF_CONDUCT_VERSION)\s*=\s*\d+/

// Files that must import the versions from @bivaque/domain (the single source).
const MUST_IMPORT = [
  join(root, "apps", "web", "middleware.ts"),
  join(root, "apps", "web", "app", "(preauth)", "onboarding", "page.tsx"),
  join(root, "apps", "web", "app", "(preauth)", "onboarding", "document-actions.ts"),
  join(root, "apps", "web", "app", "auth", "callback", "route.ts"),
  join(root, "apps", "web", "app", "api", "onboarding", "route.ts"),
  join(root, "apps", "web", "lib", "onboarding", "verifyAndProvision.ts"),
]

const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo", "dist", "build"])
const CODE_EXT = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (SKIP_DIRS.has(entry)) return []
    const stats = statSync(path)
    if (stats.isDirectory()) return walk(path)
    if (!CODE_EXT.test(entry)) return []
    return [path]
  })

const files = SCAN_ROOTS.flatMap((scanRoot) => walk(scanRoot))

test("the scanner reaches source files in apps/web/app and apps/web/lib", () => {
  const appFiles = files.filter((f) => f.includes(join("apps", "web", "app")))
  const libFiles = files.filter((f) => f.includes(join("apps", "web", "lib")))
  assert.ok(appFiles.length > 0, "apps/web/app produced no files; walk is broken")
  assert.ok(libFiles.length > 0, "apps/web/lib produced no files; walk is broken")
})

test("no executable file in apps/web declares its own consent version constant", () => {
  const hits = []
  for (const file of files) {
    const code = readFileSync(file, "utf8")
    // Strip comments so documentation cannot mask or be masked by executable
    // references. Strings are kept: a literal inside a string is executable too.
    const stripped = code.replace(/(\/\/.*$)/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
    if (FORBIDDEN_LOCAL.test(stripped)) {
      hits.push(file.replace(`${root}/`, ""))
    }
  }
  assert.deepEqual(
    hits,
    [],
    "local consent version constants declared in: " +
      hits.join(", ") +
      ". " +
      "The versions must come from @bivaque/domain (D2 Task 3 single source).",
  )
})

test("the five consumers import the versions from @bivaque/domain", () => {
  const missing = []
  for (const file of MUST_IMPORT) {
    const code = readFileSync(file, "utf8")
    if (!code.includes('from "@bivaque/domain"')) {
      missing.push(file.replace(`${root}/`, ""))
    }
  }
  assert.deepEqual(
    missing,
    [],
    "files not importing from @bivaque/domain: " +
      missing.join(", ") +
      ". " +
      "They must use the single source for consent versions (D2 Task 3).",
  )
})
