import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..")

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mjs", ".js", ".sql", ".toml", ".json"])

const BOUNDARY_TERMS =
  /\b(firebase|microservice|anonymous posting|anon_posts?|public verification badge|alerts? broadcast)\b/i

const SECOND_UI_LIBRARY = /from ["'](shadcn|@radix-ui|@headlessui|@mui|@chakra)/

// This file carries the pattern itself plus the fixture that proves it still
// fires, the same reason the boundary rule below excludes this file.
const SECOND_UI_LIBRARY_EXCLUSIONS = [/product-boundaries-and-pii\.test\.ts$/]

// Files that legitimately mention boundary terms inside prohibition regexes,
// denial tests and docs.
const BOUNDARY_EXCLUSIONS = [
  /feed-post\.tsx$/,
  /recommendations[\\/]page\.tsx$/,
  /contracts[\\/]src[\\/]index\.ts$/,
  /domain[\\/]src[\\/]index\.ts$/,
  /community_feed\.sql$/,
  /recommendations\.sql$/,
  /fix_forbidden_content_regex\.sql$/,
  /community-feed-denials\.sql$/,
  /prohibited-content\.test\.ts$/,
  /prohibited-commercial-fields\.test\.ts$/,
  /product-boundaries-and-pii\.test\.ts$/,
  /dm-pii-redaction\.test\.ts$/,
  /notification-pii-redaction\.test\.ts$/,
  /reports-pii-redaction\.test\.ts$/,
  /portal-redaction-and-negative-fixtures\.test\.ts$/,
  /log-redaction\.test\.ts$/,
  /PILOT_RUNBOOK\.md$/,
  /GO-NO-GO-REPORT\.md$/,
  /\.omo[\\/]/,
  /notepad/,
]

// The file list comes from git, not from a directory walk.
//
// The walk enumerated every directory under the repo root and skipped the
// uninteresting ones by exact NAME, so each new large directory reopened the
// same failure: .claude/worktrees/ made the scan run twice and blow the 5s
// timeout (2026-08-20), then .pnpm-store/, apps/mobile/android/,
// apps/mobile/dist-ios/ and .codex-remote-attachments/ did it again
// (2026-09-02). The exclusion list could never win that race — "dist" does not
// match "dist-ios", none of those directories are gitignored, and entries like
// "supabase/.temp" could not match at all, because the walk compared a single
// directory name against a path.
//
// What this file enforces is a contract over VERSIONED product code, so the
// tracked set is both the correct input and one that no build output, package
// store or nested checkout can grow. Cost is a single git call instead of a
// full stat of the working tree.
let cachedSourceFiles: string[] | null = null

function listSourceFiles(): string[] {
  if (cachedSourceFiles) return cachedSourceFiles
  let tracked: string
  try {
    tracked = execFileSync("git", ["ls-files", "-z", "--cached"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (cause) {
    // Never degrade to an empty list: a silent [] makes every assertion below
    // pass vacuously, which is worse than the timeout this replaced.
    throw new Error(`could not list tracked files with git in ${root}`, { cause })
  }
  cachedSourceFiles = tracked
    .split("\0")
    .filter((entry) => SOURCE_EXTENSIONS.has(entry.slice(entry.lastIndexOf("."))))
    .map((entry) => join(root, entry))
    // A file can be tracked and still deleted in the working tree.
    .filter((file) => existsSync(file))
  return cachedSourceFiles
}

function scanFiles(files: string[], pattern: RegExp, exclude: RegExp[] = []): string[] {
  const hits: string[] = []
  for (const file of files) {
    if (exclude.some((e) => e.test(file))) continue
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (pattern.test(line)) {
        hits.push(`${file}: ${line.trim().slice(0, 120)}`)
      }
    }
  }
  return hits
}

function scan(pattern: RegExp, exclude: RegExp[] = []): string[] {
  return scanFiles(listSourceFiles(), pattern, exclude)
}

describe("product boundaries and PII audit", () => {
  it("has no static export or forbidden framework config", () => {
    // Given the Next config
    const nextConfig = readFileSync(join(root, "apps/web/next.config.ts"), "utf8")

    // Then the app stays on the server runtime
    expect(nextConfig).not.toContain('output: "export"')
    expect(nextConfig).not.toContain('"export"')
  })

  it("scans the versioned product source and not build output", () => {
    // Given the file list every rule below runs against
    const files = listSourceFiles()
    const paths = files.map((file) => relative(root, file).replace(/\\/g, "/"))

    // Then it really reaches the product tree — without this the rules could
    // pass on an empty list and prove nothing
    expect(files.length).toBeGreaterThan(200)
    for (const anchor of [
      "apps/web/next.config.ts",
      "packages/contracts/src/index.ts",
      "supabase/database.generated.ts",
    ]) {
      expect(paths).toContain(anchor)
    }

    // And it never reaches the untracked output that made the walk time out
    const noise = paths.filter((path) =>
      /(^|\/)(node_modules|\.pnpm-store|\.next|coverage|dist|dist-ios|dist-android|android|playwright-report|test-results|\.visual|worktrees|\.codex-remote-attachments)\//.test(
        path,
      ),
    )
    expect(noise).toEqual([])
  })

  it("keeps declared product-boundary terms out of product source", () => {
    // Given the versioned source tree
    const hits = scan(BOUNDARY_TERMS, BOUNDARY_EXCLUSIONS)

    // Then no unsupported product-boundary term appears in product code.
    // "marketplace" is deliberately absent from this rule: the Bivaque
    // Vitrine is a valid product surface and a lexical ban was a false proxy
    // for an implementation constraint.
    expect(hits).toEqual([])
  })

  it("has no second UI library imports", () => {
    // Given the web app sources
    const hits = scan(SECOND_UI_LIBRARY, SECOND_UI_LIBRARY_EXCLUSIONS)

    // Then HeroUI remains the only component library
    expect(hits).toEqual([])
  })

  it("still reports a real violation of either rule", () => {
    // Given a source file that breaks both rules, scanned by the very same
    // patterns the two audits above use
    const dir = mkdtempSync(join(tmpdir(), "boundary-scan-"))
    const offender = join(dir, "offender.ts")
    try {
      writeFileSync(
        offender,
        ['import { Dialog } from "@radix-ui/react-dialog"', "const db = firebase.app()", ""].join(
          "\n",
        ),
      )

      // Then both audits catch it
      expect(scanFiles([offender], BOUNDARY_TERMS, BOUNDARY_EXCLUSIONS)).toHaveLength(1)
      expect(scanFiles([offender], SECOND_UI_LIBRARY, SECOND_UI_LIBRARY_EXCLUSIONS)).toHaveLength(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("has no client-visible PII columns or raw Portal payload fields", () => {
    // Given the generated client types (public schema only)
    const types = readFileSync(join(root, "supabase/database.generated.ts"), "utf8")

    // Then no PII/payload fields are exposed in client-facing types
    expect(types).not.toMatch(/cpf/i)
    expect(types).not.toMatch(/portal_payload|raw_payload/i)
    expect(types).not.toMatch(/residential_address|personal_address/i)
  })

  it("private schema is never generated into client types", () => {
    // Given the generated types
    const types = readFileSync(join(root, "supabase/database.generated.ts"), "utf8")

    // Then no private trust tables leak into client types
    expect(types).not.toMatch(/verification_outcomes|family_invitations|family_account_links/)
  })

  it("forbidden PII columns never exist in public migrations", () => {
    // Given the migrations
    const migrationsDir = join(root, "supabase/migrations")
    const hits: string[] = []
    const forbiddenColumns =
      /\b(cpf|portal_payload|residential_address|personal_address|patente|posto_militar|orgao_militar)\b/i
    for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"))) {
      const content = readFileSync(join(migrationsDir, file), "utf8")
      // Look only at CREATE TABLE / ALTER TABLE column declarations in the
      // public schema, skipping prohibition CHECK constraints and comments.
      const lines = content.split("\n")
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (/\b(create table|alter table)\b/.test(line) && /public\./.test(line)) {
          for (let j = i; j < Math.min(i + 60, lines.length); j++) {
            const col = lines[j]
            if (/\bcreate (index|policy|function|trigger|type)\b/.test(col)) break
            if (/\bconstraint\b/.test(col) || /\bcheck\s*\(/.test(col)) continue
            if (forbiddenColumns.test(col) && !/!~\*|~\*|regexp|pattern/i.test(col)) {
              hits.push(`${file}: ${col.trim()}`)
            }
          }
        }
      }
    }

    // Then no PII column appears in public product tables
    expect(hits).toEqual([])
  })
})
