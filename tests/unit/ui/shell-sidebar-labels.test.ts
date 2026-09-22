import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")
const appShell = join(root, "apps", "web", "app", "components", "bivaque", "app-shell.tsx")
const bottomNav = join(root, "apps", "web", "app", "components", "bivaque", "bottom-nav.tsx")

// O destino que cada rótulo de item da lateral promete. É a régua do defeito 1:
// se um item chamado "Configurações" apontar para a área de outro rótulo, o
// teste reprova — e vale para o próximo item, não só para este.
const DESTINO_POR_ROTULO: Record<string, string> = {
  Início: "/inicio",
  Explorar: "/explorar",
  Comunidades: "/communities",
  Perfil: "/profile",
  Salvos: "/salvos",
  Notificações: "/notifications",
  Configurações: "/configuracoes",
}

function extractLabeledAnchors(source: string): Array<{ href: string; label: string }> {
  const anchors = new Map<string, { href: string; label: string }>()
  const anchorPattern = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  for (const match of source.matchAll(anchorPattern)) {
    const label = /<span[^>]*>([^<]+)<\/span>/.exec(match[2])?.[1]?.trim()
    if (label) anchors.set(label, { href: match[1], label })
  }
  const secondaryPattern = /<SidebarSecondaryItem\b([\s\S]*?)\/>/g
  for (const match of source.matchAll(secondaryPattern)) {
    const href = /href="([^"]+)"/.exec(match[1])?.[1]
    const label = /label="([^"]+)"/.exec(match[1])?.[1]
    if (href && label) anchors.set(label, { href, label })
  }
  return [...anchors.values()]
}

describe("RECON-042, defeito 1 — o rótulo do item da lateral corresponde ao destino", () => {
  it("cada item rotulado aponta para a área que o rótulo nomeia", () => {
    const source = readFileSync(appShell, "utf8")
    const items = extractLabeledAnchors(source)
    expect(items.length).toBeGreaterThan(0)
    for (const { href, label } of items) {
      expect(DESTINO_POR_ROTULO[label], `rótulo sem destino declarado: ${label}`).toBeDefined()
      expect(href, `"${label}" deveria levar a ${DESTINO_POR_ROTULO[label]}`).toBe(
        DESTINO_POR_ROTULO[label],
      )
    }
  })

  it("Configurações leva a /configuracoes", () => {
    const source = readFileSync(appShell, "utf8")
    expect(extractLabeledAnchors(source)).toContainEqual({
      href: "/configuracoes",
      label: "Configurações",
    })
  })

  it("o avatar do cabeçalho continua levando a /profile", () => {
    const source = readFileSync(appShell, "utf8")
    expect(source).toContain('href="/profile"')
  })

  it("todo item de NAV_ITEMS tem rótulo que corresponde ao destino", () => {
    const source = readFileSync(bottomNav, "utf8")
    const pattern = /id:\s*"([^"]+)",\s*label:\s*"([^"]+)",[\s\S]*?href:\s*"([^"]+)"/g
    const items = [...source.matchAll(pattern)].map((match) => ({
      id: match[1],
      label: match[2],
      href: match[3],
    }))
    expect(items).toHaveLength(4)
    for (const item of items) {
      expect(DESTINO_POR_ROTULO[item.label]).toBe(item.href)
    }
  })
})
