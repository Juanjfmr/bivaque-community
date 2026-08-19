import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Onda E Task 8 Step 1 — guard that the AI curation path stays disconnected.
//
// lib/guide/deepseek.ts and lib/guide/ai-curation.ts exist (the AI adapter
// and the orchestrator) but they are NOT wired to any production code.
// The plan §Task 8 step 1 says: "Não ligue lib/guide/deepseek.ts a nada.
// Não é timidez: mandar resposta de membro para terceiro sem base legal
// declarada é o tipo de decisão que a §4.4 chama de pré-requisito de
// lançamento."
//
// This test fails the build if anything starts importing these modules.
// ADR-20260815-guia-curadoria-ia (status: proposed) is the governance gate
// that would unblock wiring; until then, this guard is the only thing
// preventing an accidental "IA sugere sem governança" leak.

const root = join(import.meta.dirname, "..", "..", "..")
const appWeb = join(root, "apps", "web")

// The two modules that must stay unwired.
const FORBIDDEN = ["lib/guide/deepseek.ts", "lib/guide/ai-curation.ts"]

function collectSourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue
      files.push(...collectSourceFiles(join(dir, entry.name)))
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(join(dir, entry.name))
    }
  }
  return files
}

describe("AI guide curation stays disconnected (E8 Step 1)", () => {
  it("no apps/web source imports the deepseek or ai-curation adapters", () => {
    // Given the entire apps/web source tree
    const files = collectSourceFiles(appWeb)

    // When we look for any import of the forbidden modules
    const offenders: string[] = []
    for (const file of files) {
      const source = readFileSync(file, "utf8")
      for (const forbidden of FORBIDDEN) {
        // Match the import path anywhere in the source: from "lib/guide/..."
        // or from a relative path that resolves to it. We only catch the
        // explicit alias to keep the check narrow — a false positive would
        // still be a real coupling that needs review.
        const alias = forbidden.split("/").pop()?.replace(".ts", "")
        if (!alias) continue
        // import ... from "<path>"  OR  import("<path>")
        if (new RegExp(`froms*["']${alias}["']`).test(source)) {
          offenders.push(`${file.replace(`${root}/`, "")} :: imports ${alias}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it("the deepseek adapter file itself is not auto-imported by the orchestrator", () => {
    // Given the AI orchestrator (ai-curation.ts) — even the in-tree orchestrator
    // must not import deepseek.ts directly, because the gate is "AI stays off".
    const orchestrator = readFileSync(join(appWeb, "lib/guide/ai-curation.ts"), "utf8")

    // Then it must not pull in deepseek
    expect(orchestrator).not.toMatch(/from\s*["']\.\/deepseek["']/)
    expect(orchestrator).not.toMatch(/from\s*["']\.\.\/deepseek["']/)
  })
})
