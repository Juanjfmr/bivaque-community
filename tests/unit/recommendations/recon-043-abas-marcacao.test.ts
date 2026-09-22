import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// RECON-043, defeito 2: as abas de /recommendations apareciam como texto solto
// na largura inteira, sem sublinhado nem estado ativo. A correcao nao inventa
// um terceiro estilo: usa a mesma marcacao de /salvos (RECON-038), que e a que
// o produto ja provou. O ListContainer e o ScrollShadow interno que evita a
// fileira virar rolagem horizontal da pagina inteira em 375.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

const recommendations = read("apps", "web", "app", "(shell)", "recommendations", "page.tsx")
const salvos = read("apps", "web", "app", "(shell)", "salvos", "page.tsx")

const TAB_IDS = ["browse", "request", "requests", "saved"] as const

// A marcacao tem de estar no proprio <Tabs>, nao num Button qualquer da pagina
// (o codigo antigo ja tinha `variant="secondary"` em botoes e continuava sem
// aba marcada).
function tabsOpeningTag(source: string): string {
  // A tag abre em varias linhas e um `=>` no atributo faria um `indexOf(">")`
  // parar cedo; a tag fecha na linha que so tem `>`.
  return source.match(/<Tabs\b[\s\S]*?\n\s*>/)?.[0] ?? ""
}

describe("RECON-043 — abas de Indicacoes", () => {
  it("usa a mesma marcacao de aba do produto, a que /salvos ja usa", () => {
    for (const [name, source] of [
      ["/salvos", salvos],
      ["/recommendations", recommendations],
    ] as const) {
      const tag = tabsOpeningTag(source)
      expect(tag, `${name}: <Tabs> sem variant secondary`).toContain('variant="secondary"')
      expect(tag, `${name}: <Tabs> sem tabs--secondary`).toContain("tabs--secondary")
      expect(source, `${name}: sem Tabs.ListContainer`).toContain("Tabs.ListContainer")
    }
  })

  it("mantem as quatro abas e os quatro paineis, pelos mesmos ids (nao muda o filtro)", () => {
    for (const id of TAB_IDS) {
      expect(recommendations, `aba ${id} ausente`).toMatch(new RegExp(`<Tabs\\.Tab[^>]*id="${id}"`))
      expect(recommendations, `painel ${id} ausente`).toContain(`hidden={selectedTab !== "${id}"}`)
    }
  })
})
