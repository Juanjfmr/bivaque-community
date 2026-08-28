import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { stripFrontMatter } from "../../../apps/web/app/(preauth)/consent/front-matter"

// A auditoria onboarding-aaa-v1-2026-08-22 achou notas editoriais ("rascunho",
// "precisa de revisão jurídica") DENTRO das regiões roláveis que o membro lê e
// aceita em /consent — é a evidência do card BLOCK-LEGAL-ENTRY. A nota não some:
// ela passa a viver no front matter YAML dos documentos, que é metadado do
// repositório e não cláusula do acordo. Este teste garante que o front matter
// nunca chegue à tela, e que o corpo continue chegando inteiro.

const root = join(import.meta.dirname, "..", "..", "..")
const legalDir = join(root, "docs", "legal")
const renderPath = join(root, "apps", "web", "app", "(preauth)", "consent", "document-render.tsx")
const LEGAL_DOCS = ["CODIGO_DE_CONDUTA.md", "PRIVACIDADE.md", "TERMOS_E_CONDICOES.md"]

describe("front matter dos documentos legais", () => {
  it("descarta o bloco YAML e mantém o corpo", () => {
    // Given a document whose editorial state sits in front matter
    const markdown = [
      "---",
      "id: exemplo",
      "status: draft",
      "review_blocker: BLOCK-LEGAL-ENTRY",
      "---",
      "",
      "# Título do documento",
      "",
      "Primeira cláusula.",
    ].join("\n")

    // When the front matter is stripped for the consent screen
    const body = stripFrontMatter(markdown)

    // Then the member reads the agreement and none of the metadata
    expect(body).toContain("Título do documento")
    expect(body).toContain("Primeira cláusula.")
    expect(body).not.toContain("review_blocker")
    expect(body).not.toContain("status: draft")
    expect(body).not.toContain("id: exemplo")
  })

  it("não mexe em documento que não tem front matter", () => {
    // Given a document with no front matter
    const markdown = "# Só o corpo\n\nUma cláusula.\n"

    // When stripped
    // Then nothing is swallowed
    expect(stripFrontMatter(markdown)).toBe(markdown)
  })

  it("só corta o bloco do topo, nunca um separador do corpo", () => {
    // Given a document that uses --- as a horizontal rule between chapters
    const markdown = "---\nid: exemplo\n---\n\n# Um\n\n---\n\n# Dois\n"

    // When stripped
    const body = stripFrontMatter(markdown)

    // Then the chapter separator survives
    expect(body).toBe("\n# Um\n\n---\n\n# Dois\n")
  })

  it("o renderizador da tela de consentimento usa o strip", () => {
    // Given the renderer /consent actually calls
    const source = readFileSync(renderPath, "utf8")

    // Then it goes through stripFrontMatter — sem isso, o YAML volta à tela
    expect(source).toContain('from "./front-matter"')
    expect(source).toMatch(/stripFrontMatter\(markdown\)/)
  })

  it.each(LEGAL_DOCS)("%s não vaza metadado nem nota de rascunho para a tela", (name) => {
    // Given the real document shipped in docs/legal/
    const markdown = readFileSync(join(legalDir, name), "utf8")

    // When stripped exactly as /consent strips it
    const body = stripFrontMatter(markdown)

    // Then the member sees the agreement, not the repository's editorial state
    expect(body.length).toBeGreaterThan(0)
    for (const leak of ["review_blocker:", "status: draft", "updated_at:", "pending:"]) {
      expect(body).not.toContain(leak)
    }
    // E nenhuma nota de revisão sobrou dentro do corpo aceito.
    expect(body).not.toMatch(/Rascunho de \d{4}-\d{2}-\d{2}/)
    expect(body).not.toMatch(/[Pp]recisa de revisão jurídica/)
  })
})
