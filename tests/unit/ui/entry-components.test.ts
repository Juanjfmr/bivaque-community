import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// PORT-002 (lote 4 da entrada): os componentes da casca da entrada. A prova de
// markup do símbolo e dos adaptadores vive em entry-material-adapters.test.ts
// (renderToStaticMarkup); aqui a varredura de fonte mira as decisões que quebram
// em silêncio: o texto do passo, o `role` do erro e a classe dos tokens.
const ENTRY_DIR = join(process.cwd(), "apps", "web", "app", "components", "entry")
const source = (name: string) => readFileSync(join(ENTRY_DIR, name), "utf8")

describe("indicador de passo", () => {
  const steps = source("entry-steps.tsx")

  it("escreve Passo N de 3 com o rótulo do passo", () => {
    expect(steps).toContain("const TOTAL = 3")
    expect(steps).toContain("`Passo ${step} de ${TOTAL} · ${label}`")
  })

  it("preenche só as barras cumpridas e diz o passo ao leitor de tela", () => {
    expect(steps).toContain('role="img"')
    expect(steps).toContain("aria-label={`Passo ${step} de ${TOTAL}`}")
    expect(steps).toContain("step >= 1")
    expect(steps).toContain("step >= 2")
    expect(steps).toContain("step >= 3")
    expect(steps.match(/<i /g)?.length).toBe(3)
  })
})

describe("área de erro", () => {
  const error = source("entry-error.tsx")

  it("existe sempre e anuncia a mensagem", () => {
    expect(error).toContain('role="alert"')
    expect(error).toContain('className="en-err"')
    expect(error).toContain("{children}")
  })

  it("a linha reserva altura para o formulário não pular", () => {
    expect(source("entry.css")).toMatch(/\.en-err\s*\{[^}]*min-height: 20px/)
  })
})

describe("casca da entrada", () => {
  const shell = source("entry-shell.tsx")

  it("aplica os tokens reutilizáveis e as fontes da marca", () => {
    expect(shell).toContain("bv-skin bv-entry")
    expect(shell).toContain("notoSans.variable")
    expect(shell).toContain("notoSerif.variable")
    expect(shell).toContain("materialSymbols.variable")
    expect(shell).toContain('"../../brand-tokens.css"')
    expect(shell).toContain('"./entry.css"')
  })

  it("tem o símbolo oficial e o voltar opcional", () => {
    expect(shell).toContain("import { BrandMark }")
    expect(shell).toContain("<BrandMark />")
    expect(shell).toContain('label="Voltar"')
    expect(shell).toContain("backHref ?")
    expect(shell).toContain('<MaterialIcon name="arrow_back" />')
  })

  it("os dois temas vêm dos tokens, não de uma cor local", () => {
    const css = source("entry.css")

    expect(css).toContain("--md-sys-color-surface")
    expect(css).toContain("--md-sys-color-on-surface")
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
