import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")
const runbookPath = join(root, "docs", "PILOT_RUNBOOK.md")

const requiredProcedures = [
  "Portal token stewardship (chave-api-dados)",
  "Invite issuance",
  "Verification failure response",
  "Family-invite revocation",
  "Report resolution",
  "Backup and rollback",
  "City waitlist communication",
  "Daily health checks",
  "Rollback tabletop test decision points",
  "Post-incident review",
]

describe("PILOT_RUNBOOK.md contract", () => {
  it("exists in the docs directory", () => {
    // Given the repository documentation directory
    // When the runbook file is resolved
    // Then the runbook exists
    expect(existsSync(runbookPath)).toBe(true)
  })

  it("is a non-empty markdown file", () => {
    // Given the runbook exists
    // When its contents are read
    const content = readFileSync(runbookPath, "utf8")

    // Then it contains substantive documentation
    expect(content.length).toBeGreaterThan(100)
    expect(content.trim()).not.toBe("")
  })

  for (const procedure of requiredProcedures) {
    it(`documents "${procedure}" by name`, () => {
      // Given the runbook content
      const content = readFileSync(runbookPath, "utf8")

      // When we search for the procedure name
      // Then the procedure is documented as a named section or checklist item
      expect(content.includes(procedure)).toBe(true)
    })
  }

  it("references executable commands from this repo", () => {
    // Given the runbook content
    const content = readFileSync(runbookPath, "utf8")

    // When we search for repo commands
    // Then the runbook references at least one executable pnpm or supabase command
    const hasPnpmCommand = content.includes("pnpm") || content.includes("npx pnpm")
    const hasSupabaseCommand = content.includes("supabase")

    expect(hasPnpmCommand || hasSupabaseCommand).toBe(true)
  })

  it("references the Portal chave-api-dados header by name", () => {
    // Given the runbook content
    const content = readFileSync(runbookPath, "utf8")

    // When we search for the Portal auth header
    // Then the header name is documented
    expect(content.includes("chave-api-dados")).toBe(true)
  })

  it("references environment variable names from .env.example", () => {
    // Given the runbook content
    const content = readFileSync(runbookPath, "utf8")

    // When we search for the required environment variables
    // Then all env vars are referenced
    const envVars = [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "PORTAL_DADOS_API_KEY",
    ]

    for (const envVar of envVars) {
      expect(content.includes(envVar)).toBe(true)
    }
  })

  it("includes a rollback tabletop test section with decision points", () => {
    // Given the runbook content
    const content = readFileSync(runbookPath, "utf8")

    // When we search for the rollback tabletop section
    // Then it contains expected decision-point language
    expect(content.includes("Rollback tabletop test decision points")).toBe(true)
    expect(content.includes("decision")).toBe(true)
  })
})
