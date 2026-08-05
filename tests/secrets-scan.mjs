#!/usr/bin/env node

/**
 * Secrets scanner for tracked repo files.
 *
 * Scans all non-binary tracked files for secret patterns (tokens, CPF samples,
 * real API keys, etc.). Exits 0 when clean, exits 1 with findings.
 *
 * .env.example placeholders (using <...> or empty strings) and test fixtures
 * using example.invalid are whitelisted.
 */

import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..")

// ── patterns that indicate a real secret ──

const patterns = [
  {
    name: "CPF numeric",
    regex: /\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}\b/g,
  },
  {
    name: "JWT token (eyJ...)",
    regex: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    name: "Supabase service_role key in code/sql",
    regex: /(?:service_role|service\.role)\b.{0,30}["'\s:=]+(?!.*<)(eyJ[A-Za-z0-9_-]{30,})/g,
  },
  {
    name: "Portal API key value (chave-api-dados with value)",
    regex: /\bchave-api-dados\s*[:=]\s*["']?\S{10,}["']?/gi,
  },
  {
    name: "Real Supabase project URL",
    regex: /https:\/\/[a-z0-9]{20}\.supabase\.co/g,
  },
  {
    name: "Credential assigned as a literal",
    // A bare password has no recognisable shape, so it is caught by the name it
    // is bound to, not by the value. Matches PASSWORD/SECRET/API_KEY/CREDENTIAL
    // identifiers receiving a quoted string. Reads from process.env or a helper
    // call are function/member expressions, not string literals, so they never
    // match. Exclusions for placeholders and inert values are in the filter.
    regex:
      /\b[A-Za-z0-9_]*(?:password|passwd|secret|api[_-]?key|credential)[A-Za-z0-9_]*\s*[:=]\s*(["'`])([^"'`\n]{6,})\1/gi,
  },
  {
    name: "Generic base64-looking token (40+ chars)",
    // Only flag if it looks like a standalone token, not part of a URL or placeholder
    regex: /(?<![<"'\w])[A-Za-z0-9+/]{40,}(?![>"'\w])/g,
    // Exclusions handled in the filter below
  },
]

// ── file exclusions ──

const skipPatterns = [
  /node_modules/,
  /\.git\//,
  /pnpm-lock\.yaml/,
  /\.next\//,
  /playwright-report\//,
  /test-results\//,
  /\.supabase\//,
  /database\.generated\.ts$/,
  /\.png$/,
  /\.ico$/,
  /\.webp$/,
  /\.svg$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.eot$/,
  /\.lock$/,
]

function shouldSkip(filePath) {
  return skipPatterns.some((p) => p.test(filePath))
}

// ── known synthetic / false-positive CPF values ──

const syntheticCpfPatterns = [
  /^0{11}$/, // 00000000000 (all formats)
  /^123456789\d{2}$/, // 123.456.789-xx
  /^52998224725$/, // known test fixture in log-redaction
  /^98765432100$/, // known test fixture in portal-redaction
  /^00011122233$/, // known test fixture
]

function isSyntheticCpf(matchText) {
  const normalized = matchText.replace(/[.\s-]/g, "")
  return syntheticCpfPatterns.some((p) => p.test(normalized))
}

// ── known false-positive sources ──

function isPlaceholder(lineContent) {
  // .env.example placeholders use <...>
  if (/["']?\s*<[^>]+>\s*["']?/.test(lineContent)) return true
  // test fixtures reference example.invalid
  if (/example\.invalid/.test(lineContent)) return true
  // generated hashes / digests in comments/configs
  if (/integrity\s/.test(lineContent) || /sha(256|512)-/.test(lineContent)) return true
  return false
}

// Repo-relative source paths, e.g. apps/web/lib/onboarding/verifyAndProvision.
// The generic token regex accepts "/", so any path of 40+ characters looks like
// a base64 blob to it. Anchoring on the workspace's real top-level directories
// keeps the exclusion narrow: a credential does not start with "apps/".
const repoRoots = ["apps", "packages", "supabase", "scripts", "tests", "docs"]

function isRepoPath(matchText) {
  const slash = matchText.indexOf("/")
  if (slash === -1) return false
  if (!repoRoots.includes(matchText.slice(0, slash))) return false
  return /^[A-Za-z0-9._/-]+$/.test(matchText)
}

// ── scan ──

const trackedFiles = execSync("git ls-files", { encoding: "utf8", cwd: root })
  .split("\n")
  .filter(Boolean)
  .filter((f) => !shouldSkip(f))

let totalFindings = 0

for (const file of trackedFiles) {
  const fullPath = join(root, file)
  if (!existsSync(fullPath)) continue
  const content = readFileSync(fullPath, "utf8")
  const lines = content.split("\n")

  for (const pattern of patterns) {
    // Reset regex state
    pattern.regex.lastIndex = 0

    const matches = content.matchAll(pattern.regex)
    for (const match of matches) {
      // Determine which line the match is on
      const lineIdx = content.substring(0, match.index).split("\n").length - 1
      const line = lines[lineIdx] || ""

      if (isPlaceholder(line)) continue

      // Skip known synthetic CPF values used in test fixtures
      if (pattern.name === "CPF numeric" && isSyntheticCpf(match[0])) continue

      // Skip base64-looking tokens that are inside angle-bracket placeholders
      if (match[0].includes("<") || match[0].includes(">")) continue

      // Skip config enums that happen to be bound to a credential-ish name,
      // e.g. password_requirements = "letters_digits" in supabase/config.toml.
      // A real credential carries a digit, a capital or a symbol; a value of
      // only lowercase letters and underscores is a setting. The cost is that
      // an all-lowercase-letters password would pass, which is accepted: the
      // alternative is a false positive on every such config key.
      if (pattern.name === "Credential assigned as a literal" && /^[a-z_]+$/.test(match[2])) {
        continue
      }

      // Skip repo-relative source paths. The generic token regex allows "/",
      // so any path of 40+ chars matches it — docs that cite a file by full
      // path would otherwise fail the scan. Anchored to real top-level
      // directories of this workspace: a credential never starts at "apps/".
      if (pattern.name.startsWith("Generic base64") && isRepoPath(match[0])) continue

      console.error(`${file}:${lineIdx + 1}: ${pattern.name} — ${match[0].substring(0, 60)}`)
      totalFindings++
    }
  }
}

if (totalFindings > 0) {
  console.error(`\n${totalFindings} secret finding(s) detected.`)
  process.exit(1)
}

console.log("Secrets scan passed — no secrets detected in tracked files.")
process.exit(0)
