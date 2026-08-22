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

// A real CPF always satisfies the mod-11 check digits, so requiring them costs
// nothing in coverage and drops ~99% of unrelated 11-digit runs of numbers
// (CI run ids, timestamps, phone digits) that the bare \d{11} regex flags.
function hasValidCpfCheckDigits(digits) {
  const digit = (upTo) => {
    let sum = 0
    for (let i = 0; i < upTo; i++) sum += Number(digits[i]) * (upTo + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return digit(9) === Number(digits[9]) && digit(10) === Number(digits[10])
}

function isSyntheticCpf(matchText) {
  const normalized = matchText.replace(/[.\s-]/g, "")
  if (!hasValidCpfCheckDigits(normalized)) return true
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

// Git commit hashes have a fixed shape that real secrets do not: only hex
// (`[0-9a-f]`) and exactly 40 (SHA-1) or 64 (SHA-256) characters. The exclusion
// is conservative — it lets through any token with mixed case, +, / or =
// (which is what real base64/JWT/API-key secrets actually look like).
function isGitSha(matchText) {
  return /^[0-9a-f]{40}$/i.test(matchText) || /^[0-9a-f]{64}$/i.test(matchText)
}

// Prose that happens to be slash-separated. The same "/" in the generic token
// regex makes a line like "Gate/Upload/Recurso/Consentimento/Convites" — five
// section names listed in a plan — read as a 41-character blob. Three or more
// segments that are each a plain word, with no digit and no "+" anywhere, is
// not a shape base64 produces: a 40-character token without a single digit has
// a probability under one in a thousand, and the word segments drive it to
// zero. Narrower than excluding docs/ from the scan, which would let a real
// credential pasted into a document through.
function isSlashSeparatedProse(matchText) {
  if (!matchText.includes("/")) return false
  if (/[0-9+]/.test(matchText)) return false
  const segments = matchText.split("/")
  if (segments.length < 3) return false
  return segments.every((segment) => /^[A-Za-z]{2,}$/.test(segment))
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

      // Skip git commit hashes (SHA-1 40 hex / SHA-256 64 hex). RUNTIME_FINDINGS,
      // ADJUDICATION and similar design-audit docs cite commits by SHA to
      // anchor a finding to the change that introduced it. The shape is
      // specific enough (only `[0-9a-f]`, exact length) that a real secret
      // landing on the same surface would still be caught: real tokens are
      // base64 (mixed case, +, /, =) or JWT (eyJ...). Found closing onda G
      // (2026-08-21): 17 of the 29 false positives were git SHAs in docs.
      if (pattern.name.startsWith("Generic base64") && isGitSha(match[0])) continue

      // Skip slash-separated prose: taxonomy labels in the design-audit docs
      // (`palette/type/spacing/radius`) and section lists in the plans
      // (`Gate/Upload/Recurso/Consentimento`) both read as one long blob to
      // the generic regex.
      //
      // Merge note (2026-08-21): the two branches wrote this exclusion
      // independently. The wider form — anything matching `^[a-zA-Z/]+$` —
      // also swallows a 40-character run of letters with no slash at all, and
      // a base64 secret with no digit and no +/= is improbable but not
      // impossible. isSlashSeparatedProse is the stricter of the two and still
      // covers every documented false positive from both sides, so it is the
      // one that survives.
      if (pattern.name.startsWith("Generic base64") && isSlashSeparatedProse(match[0])) continue

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
