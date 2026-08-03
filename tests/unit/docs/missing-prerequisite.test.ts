import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")
const runbookPath = join(root, "docs", "PILOT_RUNBOOK.md")

// Patterns that must NEVER appear in the runbook.
// CPF pattern: 11 digits with common formatting separators.
const cpfPattern = /\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}\b/g
// JWT / Supabase service role key pattern (long base64-ish string).
const jwtPattern = /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g
// Generic secret-looking patterns: long alphanumeric strings that look like tokens.
const longTokenPattern = /\b[A-Za-z0-9+/=]{40,}\b/g
// Portal API key placeholder leak: exact key-looking strings.
const portalKeyPattern = /\bchave-api-dados\s*[:=]\s*\S{10,}\b/gi
// CPF sample indicators.
const cpfLabelPattern = /\bCPF\s*[:=]\s*\d/gi

function scanForSecrets(content: string): string[] {
  const findings: string[] = []

  if (cpfPattern.test(content)) {
    findings.push("CPF pattern detected (11-digit numeric with separators)")
  }

  if (jwtPattern.test(content)) {
    findings.push("JWT token pattern detected")
  }

  // Reset regex state for longTokenPattern
  const longMatches = content.match(longTokenPattern)
  if (longMatches) {
    // Filter out non-secret long strings: URLs, HTML attributes, file paths, etc.
    const suspicious = longMatches.filter((m) => {
      // Allow URLs
      if (m.startsWith("https://") || m.startsWith("http://")) return false
      // Allow base64 in data URLs
      if (content.includes(`data:image`)) return false
      // Allow Supabase URL placeholders with angle brackets
      if (m.includes("<") || m.includes(">")) return false
      // Allow common non-secret long strings in docs (UUIDs, hashes in context)
      if (/^[a-f0-9]{40,}$/i.test(m)) return false
      // Allow the env placeholder pattern
      if (m.startsWith("<")) return false
      return true
    })
    if (suspicious.length > 0) {
      findings.push(`Long token-like strings: ${suspicious.length} found`)
    }
  }

  if (portalKeyPattern.test(content)) {
    findings.push("Portal API key value pattern detected (chave-api-dados followed by value)")
  }

  if (cpfLabelPattern.test(content)) {
    findings.push("CPF label with digit detected (potential CPF sample)")
  }

  // Check for real-looking Supabase URL (not the placeholder)
  const supabaseUrlRealPattern = /https:\/\/[a-z]{20}\.supabase\.co/g
  if (supabaseUrlRealPattern.test(content)) {
    findings.push("Specific Supabase project URL detected (should use placeholder <project>)")
  }

  return findings
}

describe("PILOT_RUNBOOK.md missing prerequisites", () => {
  it("does not contain CPF samples", () => {
    // Given the runbook content
    const content = readFileSync(runbookPath, "utf8")

    // When we scan for CPF patterns
    // Then no CPF numbers are present
    const cpfPatternFresh = /\b\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[.\s-]?\d{2}\b/g
    expect(cpfPatternFresh.test(content)).toBe(false)
  })

  it("does not contain JWT or service-role tokens", () => {
    // Given the runbook content
    const content = readFileSync(runbookPath, "utf8")

    // When we scan for JWT patterns
    // Then no real tokens are present
    const jwtPatternFresh = /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g
    expect(jwtPatternFresh.test(content)).toBe(false)
  })

  it("does not contain a real Portal API key value", () => {
    // Given the runbook content
    const content = readFileSync(runbookPath, "utf8")

    // When we scan for chave-api-dados followed by an actual value
    // Then only the header name appears, not a real key value
    const portalKeyFresh = /\bchave-api-dados\s*[:=]\s*\S{10,}\b/gi
    expect(portalKeyFresh.test(content)).toBe(false)
  })

  it("does not contain real Supabase project URLs", () => {
    // Given the runbook content
    const content = readFileSync(runbookPath, "utf8")

    // When we scan for specific Supabase project URLs
    // Then only placeholder patterns with <project> are used
    const realUrlPattern = /https:\/\/[a-z0-9]{20}\.supabase\.co/g
    expect(realUrlPattern.test(content)).toBe(false)
  })

  // Comprehensive secrets scan
  it("passes the full secrets scan with zero findings", () => {
    // Given the runbook content
    const content = readFileSync(runbookPath, "utf8")

    // When the full secrets scanner runs
    const findings = scanForSecrets(content)

    // Then there are zero findings
    expect(findings).toEqual([])
  })
})
