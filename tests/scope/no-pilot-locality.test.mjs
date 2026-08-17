import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

// P0 Task 7 Step 3: the scope guard that mechanizes the acceptance criterion
// "runtime does not use PILOT_LOCALITY_ID to authorize, provision, or filter
// content" from issue #20 and ADR-20260816-national-localities decision 6.
//
// Without this test the criterion is a sentence someone checks once. With it,
// any reintroduction of a constant pilot locality identifier in executable
// code under apps/web/app or apps/web/lib fails CI.
//
// The test strips comments before searching, so documentation that mentions
// the old identifier (e.g. the resolver's JSDoc explaining what was removed)
// does not false-positive — and cannot hide an executable reference either.
// String literals are preserved: a hardcoded Manaus UUID inside a string is
// the pilot constant in disguise and must fail this guard.

const root = join(import.meta.dirname, "..", "..")
const SCAN_ROOTS = [join(root, "apps", "web", "app"), join(root, "apps", "web", "lib")]

const FORBIDDEN = [
  {
    id: "PILOT_LOCALITY_ID",
    // Word-bounded so it does not match the env var names below, which
    // contain it as a suffix.
    test: (code) => /(?<![A-Za-z0-9_])PILOT_LOCALITY_ID(?![A-Za-z0-9_])/.test(code),
  },
  {
    id: "BIVAQUE_PILOT_LOCALITY_ID",
    test: (code) => /(?<![A-Za-z0-9_])BIVAQUE_PILOT_LOCALITY_ID(?![A-Za-z0-9_])/.test(code),
  },
  {
    id: "NEXT_PUBLIC_BIVAQUE_PILOT_LOCALITY_ID",
    test: (code) =>
      /(?<![A-Za-z0-9_])NEXT_PUBLIC_BIVAQUE_PILOT_LOCALITY_ID(?![A-Za-z0-9_])/.test(code),
  },
  {
    id: "00000000-0000-4000-8000-000000000001",
    // The hardcoded Manaus UUID that the old fallback resolved to. Literal
    // search — the string is specific enough.
    test: (code) => code.includes("00000000-0000-4000-8000-000000000001"),
  },
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

// Strip comments so documentation cannot mask or be masked by executable
// references. Keeps newlines so line numbers in failure messages stay useful.
// String literals are preserved: a forbidden identifier inside a string is
// executable code, not documentation.
function stripComments(source) {
  let out = ""
  let i = 0
  const n = source.length
  while (i < n) {
    const ch = source[i]
    const next = source[i + 1]

    if (ch === "/" && next === "/") {
      while (i < n && source[i] !== "\n") i++
      continue
    }

    if (ch === "/" && next === "*") {
      i += 2
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] === "\n") out += "\n"
        i++
      }
      i += 2
      continue
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch
      out += ch
      i++
      while (i < n && source[i] !== quote) {
        if (source[i] === "\\") {
          out += source[i]
          i++
          if (i < n) out += source[i]
          i++
          continue
        }
        if (source[i] === "\n") out += "\n"
        out += source[i] ?? ""
        i++
      }
      if (i < n) {
        out += source[i]
        i++
      }
      continue
    }

    out += ch
    i++
  }
  return out
}

const files = SCAN_ROOTS.flatMap((scanRoot) => walk(scanRoot))

test("the scanner reaches source files in both apps/web/app and apps/web/lib", () => {
  // Given the two scan roots
  // When the walker collects files
  const appFiles = files.filter((f) => f.includes(join("apps", "web", "app")))
  const libFiles = files.filter((f) => f.includes(join("apps", "web", "lib")))

  // Then both directories are represented — a silent walk failure would make
  // the forbidden-identifier assertions below pass vacuously.
  assert.ok(appFiles.length > 0, "apps/web/app produced no files; walk is broken")
  assert.ok(libFiles.length > 0, "apps/web/lib produced no files; walk is broken")
})

test("the resolver lives in the locality-context module and the shell wires it", () => {
  // Given the new resolver location and the shell layout
  const context = readFileSync(join(root, "apps", "web", "lib", "locality-context.tsx"), "utf8")
  const layout = readFileSync(join(root, "apps", "web", "app", "(shell)", "layout.tsx"), "utf8")

  // When the executable code is inspected (comments stripped)
  const contextCode = stripComments(context)
  const layoutCode = stripComments(layout)

  // Then the provider and hook are exported from the context module
  assert.match(contextCode, /export function LocalityContextProvider/)
  assert.match(contextCode, /export function useLocalityContext/)

  // And the layout resolves the member's locality and feeds the provider,
  // not the consumer components directly.
  assert.match(layoutCode, /from\s+["'].*locality-context["']/)
  assert.match(layoutCode, /LocalityContextProvider/)
  assert.match(layoutCode, /locality_memberships/)
})

test("the comment stripper ignores identifiers inside comments and strings", () => {
  // Given a source sample with a forbidden identifier in a comment and a
  // string, plus a real executable reference
  const sample = [
    "// PILOT_LOCALITY_ID is gone from this file",
    "/* the old fallback 00000000-0000-4000-8000-000000000001 was removed */",
    'const note = "PILOT_LOCALITY_ID mentioned in a string"',
    "const x = PILOT_LOCALITY_ID",
  ].join("\n")

  // When the stripper runs
  const code = stripComments(sample)

  // Then only the executable reference on the last line survives
  assert.equal(/(?<![A-Za-z0-9_])PILOT_LOCALITY_ID(?![A-Za-z0-9_])/.test(code), true)
  // And the UUID inside the block comment is gone
  assert.equal(code.includes("00000000-0000-4000-8000-000000000001"), false)
  // And the string-quoted mention is preserved (strings are executable code)
  assert.equal(code.includes('"PILOT_LOCALITY_ID mentioned in a string"'), true)
})

for (const { id, test: matches } of FORBIDDEN) {
  test(`no executable reference to ${id} under apps/web/app or apps/web/lib`, () => {
    // Given every source file under both scan roots
    // When comments are stripped and the remaining executable code is searched
    const hits = []
    for (const file of files) {
      const code = stripComments(readFileSync(file, "utf8"))
      if (matches(code)) {
        hits.push(file.replace(`${root}/`, ""))
      }
    }

    // Then no executable code references the forbidden identifier. A comment
    // that mentions it is fine; an import, a call, or a literal is not.
    assert.deepEqual(
      hits,
      [],
      `executable references to "${id}" found in: ${hits.join(", ")}. ` +
        "This identifier re-introduces a constant pilot locality in runtime " +
        "code, which ADR-20260816-national-localities decision 6 prohibits. " +
        "Comments are stripped before searching, so only executable " +
        "references (imports, calls, string literals) fail this guard.",
    )
  })
}
