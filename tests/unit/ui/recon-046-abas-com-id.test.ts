import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// RECON-046: o painel do react-aria so monta quando o `id` bate com a aba
// selecionada. Um componente de aba ou de painel declarado apenas com `key`
// (ou sem identificador nenhum) nunca monta — a area fica branca sob os
// rotulos. Foi o defeito medido em /events (RECON-043) e repetido em
// /communities e na tela de uma comunidade (RECON-046).
//
// A cobranca e sobre o padrao, nao sobre duas telas: um teste que so olhasse
// estas ocorrencias nao impediria a terceira. Por isso varremos toda a arvore
// de telas do app e reprovamos qualquer <Tab>, <Tabs.Tab> ou <TabPanel> sem
// `id`.
const root = join(import.meta.dirname, "..", "..", "..")
const appDir = join(root, "apps", "web", "app")

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.name.endsWith(".tsx")) out.push(full)
  }
  return out
}

// Le a tag de abertura inteira a partir do "<Tag", respeitando chaves e
// strings, para nao parar no `>` de uma arrow function num atributo.
function openingTags(source: string, tagPattern: RegExp): { tag: string; line: number }[] {
  const found: { tag: string; line: number }[] = []
  const re = new RegExp(tagPattern.source, "g")
  let match = re.exec(source)
  while (match !== null) {
    const start = match.index
    let i = start + match[0].length
    let brace = 0
    let quote: string | null = null
    while (i < source.length) {
      const ch = source[i]
      if (quote) {
        if (ch === quote) quote = null
        else if (ch === "\\") i++
      } else if (ch === '"' || ch === "'" || ch === "`") {
        quote = ch
      } else if (ch === "{") {
        brace++
      } else if (ch === "}") {
        brace--
      } else if (ch === ">" && brace === 0) {
        break
      }
      i++
    }
    const line = source.slice(0, start).split("\n").length
    found.push({ tag: source.slice(start, i + 1), line })
    match = re.exec(source)
  }
  return found
}

const TAB_TAG = /<Tab(?![A-Za-z])/ // <Tab>, nunca <Tabs> nem <TabPanel> nem <TabList>
const COMPOUND_TAB_TAG = /<Tabs\.Tab(?![A-Za-z])/
const PANEL_TAG = /<TabPanel(?![A-Za-z])/

describe("RECON-046 — aba e painel sempre com id", () => {
  it("nenhuma tela do app declara <Tab>, <Tabs.Tab> ou <TabPanel> sem id", () => {
    const offenders: string[] = []
    for (const file of walk(appDir)) {
      const source = readFileSync(file, "utf8")
      for (const pattern of [TAB_TAG, COMPOUND_TAB_TAG, PANEL_TAG]) {
        for (const { tag, line } of openingTags(source, pattern)) {
          if (!/(^|\s)id\s*=/.test(tag)) {
            offenders.push(`${file.slice(root.length + 1)}:${line} → ${tag.replace(/\s+/g, " ")}`)
          }
        }
      }
    }
    expect(offenders, `aba/painel sem id:\n${offenders.join("\n")}`).toEqual([])
  })

  it("as abas de /communities e de uma comunidade tem painel com o mesmo id", () => {
    const files = [
      join(appDir, "(shell)", "communities", "communities-screen.tsx"),
      join(appDir, "(shell)", "communities", "[id]", "community-detail-screen.tsx"),
    ]
    for (const file of files) {
      const source = readFileSync(file, "utf8")
      const tabIds = openingTags(source, TAB_TAG)
        .map(({ tag }) => tag.match(/(?:^|\s)id="([^"]+)"/)?.[1])
        .filter((id): id is string => Boolean(id))
      expect(tabIds.length, `${file}: nenhuma aba com id`).toBeGreaterThan(0)
      for (const id of tabIds) {
        expect(source, `${file}: aba ${id} sem painel de mesmo id`).toContain(
          `<TabPanel id="${id}"`,
        )
      }
    }
  })
})
