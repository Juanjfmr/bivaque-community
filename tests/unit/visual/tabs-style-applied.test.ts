import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

// RECON-047 — a direção oposta do guard-rail do RECON-045. Aquele (`tab-variant-rule`)
// reprova uma classe modificadora aplicada no JSX sem regra no CSS. Este reprova o
// contrário: uma tela que declara o componente de abas (`<Tabs>` do HeroUI) e não
// aplica a classe única do produto (`tabs--secondary`), nem declara por escrito por
// que aquela fileira difere.
//
// A regra de estilo é uma só, escrita pelo RECON-045 em `apps/web/app/globals.css`;
// a tela de referência é `apps/web/app/(shell)/salvos/page.tsx`. Sem este teste, as
// sete telas deste lote foram corrigidas e a oitava nasceria sem o estilo.
//
// A lista de exceções é explícita e curta de propósito. A navegação inferior precisa
// estar nela com o motivo: é navegação primária em largura pequena, não uma fileira
// de abas de conteúdo, e este lote não pode tocar nela.

const APP_DIR = join(process.cwd(), "apps", "web", "app")
const PRODUCT_STYLE = "tabs--secondary"

// Um `.tsx` que renderiza o root de abas do HeroUI. O root sozinho (`<Tabs`) e o
// acesso a subcomponentes (`<Tabs.List…`) contam; texto solto não.
const TABS_ROOT = /<Tabs[\s>.]/

// `className` como string, string simples ou template literal — o mesmo formato que o
// guard-rail do RECON-045 lê. O token precisa ser uma classe de fato, nunca um
// comentário que apenas cite o nome.
const CLASS_ATTR = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g

function walk(dir: string, extension: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".next" || entry.name === "node_modules") continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...walk(full, extension))
    else if (entry.name.endsWith(extension)) found.push(full)
  }
  return found
}

function classNames(source: string): string[] {
  const values: string[] = []
  for (const match of source.matchAll(CLASS_ATTR)) {
    values.push(match[1] ?? match[2] ?? match[3] ?? "")
  }
  return values
}

function appliesProductStyle(source: string): boolean {
  return classNames(source).some((value) => value.split(/\s+/).includes(PRODUCT_STYLE))
}

function declaresTabs(source: string): boolean {
  return TABS_ROOT.test(source)
}

const EXCEPTIONS = [
  {
    file: "apps/web/app/components/bivaque/bottom-nav.tsx",
    reason:
      'navegação primária em largura pequena (barra inferior); recebe variant="primary" de propósito, não é fileira de abas de conteúdo',
  },
  {
    file: "apps/web/app/(shell)/localidade/page.tsx",
    reason:
      "seletor segmentado em pílula das duas cidades do membro (atual e destino), não fileira de abas de conteúdo; a prancha apresenta cidade como cartões/seletor",
  },
  {
    file: "apps/web/app/(shell)/community/view-switch.tsx",
    reason:
      "seletor segmentado em pílula das duas vistas da comunidade (Conversa e Indicações), com o mesmo peso; as abas de conteúdo abaixo dele (ordem do feed, filtros de pedidos) usam o estilo do produto",
  },
] as const

function unstyleWithoutException(sources: Map<string, string>): string[] {
  const exceptions = new Set(EXCEPTIONS.map((entry) => entry.file))
  const offenders: string[] = []
  for (const [file, source] of sources) {
    if (!declaresTabs(source)) continue
    if (appliesProductStyle(source)) continue
    if (exceptions.has(file)) continue
    offenders.push(file)
  }
  return offenders.sort()
}

describe("tabs rows use the product style", () => {
  it("flags a tabs screen with neither the product style nor a declared exception", () => {
    const unstyled = '<Tabs aria-label="x"><Tabs.List><Tabs.Tab /></Tabs.List></Tabs>'
    const styled = '<Tabs className="tabs--secondary"><Tabs.List /></Tabs>'
    expect(unstyleWithoutException(new Map([["a.tsx", unstyled]]))).toEqual(["a.tsx"])
    expect(unstyleWithoutException(new Map([["a.tsx", styled]]))).toEqual([])
  })

  it("detects the style only in className, never in a comment that cites it", () => {
    expect(appliesProductStyle("// RECON-047: esta tela não usa tabs--secondary")).toBe(false)
    expect(appliesProductStyle('<Tabs className="tabs--secondary mt-4" />')).toBe(true)
    expect(appliesProductStyle("<Tabs className={`tabs--secondary`} />")).toBe(true)
  })

  it("keeps the exception list short and the bottom navigation among it", () => {
    expect(EXCEPTIONS.length).toBeLessThanOrEqual(3)
    const files = EXCEPTIONS.map((entry) => entry.file)
    expect(new Set(files).size).toBe(files.length)
    expect(files).toContain("apps/web/app/components/bivaque/bottom-nav.tsx")
    for (const entry of EXCEPTIONS) expect(entry.reason.length).toBeGreaterThan(20)
  })

  it("has no tabs screen without the product style outside the exceptions", () => {
    const sources = new Map(
      walk(APP_DIR, ".tsx").map((file) => [
        relative(process.cwd(), file).replace(/\\/g, "/"),
        readFileSync(file, "utf8"),
      ]),
    )
    expect(unstyleWithoutException(sources)).toEqual([])
  })

  it("carries the written declaration inside each shell exception it keeps", () => {
    // bottom-nav.tsx é intocável neste lote; o motivo dela vive na lista acima.
    // Toda exceção sob (shell) precisa declarar em si mesma por que difere.
    const shellExceptions = EXCEPTIONS.filter((entry) => entry.file.includes("(shell)/"))
    expect(shellExceptions.length).toBeGreaterThan(0)
    for (const entry of shellExceptions) {
      const source = readFileSync(join(process.cwd(), entry.file), "utf8")
      expect(source).toMatch(/RECON-047/)
    }
  })
})
