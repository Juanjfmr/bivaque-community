import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// RECON-048, defeito 2. /notifications era a unica tela com faixa de cabecalho
// propria: fundo --surface, border-b e sticky top-12, com o titulo e as abas
// dentro da faixa. O padrao do produto (ex.: /denuncias, que tambem tem titulo,
// abas e estado vazio) poe o titulo sobre o fundo da pagina. Este teste trava a
// forma das duas: Notificacoes adota o padrao, e a referencia nao regride.
const root = join(import.meta.dirname, "..", "..", "..")
const notificationsFile = join(root, "apps", "web", "app", "(shell)", "notifications", "page.tsx")
const referenceFile = join(
  root,
  "apps",
  "web",
  "app",
  "(shell)",
  "denuncias",
  "trust-privacy-client.tsx",
)

const BAND = /border-b border-border bg-\[var\(--surface\)\]/

describe("RECON-048 — cabecalho de Notificacoes segue o padrao de /denuncias", () => {
  const source = readFileSync(notificationsFile, "utf8")

  it("nao tem faixa de cabecalho (sticky + fundo da superficie + borda)", () => {
    expect(source).not.toMatch(/sticky\s+top-12/)
    expect(source).not.toMatch(BAND)
  })

  it("abre o conteudo com respiro depois das abas", () => {
    expect(source).toContain('className="mt-6 flex gap-6"')
  })

  it("a referencia /denuncias permanece sem faixa", () => {
    const reference = readFileSync(referenceFile, "utf8")
    expect(reference).not.toMatch(BAND)
  })
})
