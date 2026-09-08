import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..")

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mjs", ".js", ".sql", ".toml", ".json"])

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  "playwright-report",
  "test-results",
  "supabase/.temp",
  "supabase/.branches",
  // .visual/ is gitignored audit output; the screenshot text snippets
  // echo product copy that may mention forbidden terms in a negation
  // (e.g. "não um marketplace"). Scanning it produces false positives.
  ".visual",
  // .claude/worktrees/<name>/ can hold a full nested checkout of this repo;
  // without this the scan walked it twice, which under load pushed this
  // test past its 5s timeout (found closing onda T/F, 2026-08-20).
  ".claude",
])

function collectFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (EXCLUDED_DIRS.has(entry)) continue
    const stat = statSync(full)
    if (stat.isDirectory()) {
      files.push(...collectFiles(full))
    } else if (SOURCE_EXTENSIONS.has(entry.slice(entry.lastIndexOf(".")))) {
      files.push(full)
    }
  }
  return files
}

function scan(pattern: RegExp, exclude: RegExp[] = []): string[] {
  const hits: string[] = []
  for (const file of collectFiles(root)) {
    const content = readFileSync(file, "utf8")
    if (exclude.some((e) => e.test(file))) continue
    for (const line of content.split("\n")) {
      if (pattern.test(line)) {
        hits.push(`${file}: ${line.trim().slice(0, 120)}`)
      }
    }
  }
  return hits
}

describe("product boundaries and PII audit", () => {
  it("has no static export or forbidden framework config", () => {
    // Given the Next config
    const nextConfig = readFileSync(join(root, "apps/web/next.config.ts"), "utf8")

    // Then the app stays on the server runtime
    expect(nextConfig).not.toContain('output: "export"')
    expect(nextConfig).not.toContain('"export"')
  })

  it("keeps declared product-boundary terms out of product source", () => {
    // Given the source tree (excluding files that legitimately mention
    // boundary terms inside prohibition regexes, denial tests, and docs)
    const hits = scan(
      /\b(firebase|microservice|anonymous posting|anon_posts?|public verification badge|alerts? broadcast)\b/i,
      [
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
        // Historical image prompts prohibit these terms; they are not product source.
        // Keep this exception local to the lexical check, never to PII scans.
        /docs[\\/]design[\\/]visual-guide-2026-09-06[\\/]completion-generation-2026-09-08\.json$/,
        /docs[\\/]design[\\/]visual-guide-2026-09-06[\\/]manifest\.json$/,
        /PILOT_RUNBOOK\.md$/,
        /GO-NO-GO-REPORT\.md$/,
        /\.omo[\\/]/,
        /notepad/,
      ],
    )

    // Then no unsupported product-boundary term appears in product code.
    // "marketplace" is deliberately absent from this rule: the Bivaque
    // Vitrine is a valid product surface and a lexical ban was a false proxy
    // for an implementation constraint.
    expect(hits).toEqual([])
  })

  it("has no second UI library imports", () => {
    // Given the web app sources
    const hits = scan(/from ["'](shadcn|@radix-ui|@headlessui|@mui|@chakra)/)

    // Then HeroUI remains the only component library
    expect(hits).toEqual([])
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
