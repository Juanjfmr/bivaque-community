import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

// PROCESSO-DE-CONSTRUCAO.md §7 — navegação-alvo da reconstrução 2026-09-06,
// reconciliada em 05/10/2026 pela decisão direta do dono (FIGMA-001):
// Comunidades e Grupos SAÍRAM da navegação desta versão (rotas, dados e
// políticas históricas permanecem). Os containers do shell do membro são:
// Início (home de quem participa), Explorar (descoberta — inclui Guia e
// Mercado como entradas) e Perfil (o membro: perfil, conta, configurações).
// Conversas vive no shell superior e na sidebar, não como aba mobile.
// Este teste é a task: é a única coisa que impede a divergência entre spec e código voltar.
// (a) NAV_ITEMS tem exatamente esses três ids.
// (b) O número de itens respeita o teto de 5 (iOS HIG / Material).
// (c) NAV_ITEMS bate com DESIGN_SYSTEM.md §7.1.

const root = join(import.meta.dirname, "..", "..")
const NAV_PATH = join(root, "apps", "web", "app", "components", "bivaque", "bottom-nav.tsx")
const GUIDE_PATH = join(root, "docs", "agents", "DESIGN_SYSTEM.md")

const CEILING = 5

function navItemIds(source) {
  const start = source.indexOf("export const NAV_ITEMS")
  if (start === -1) throw new Error("export const NAV_ITEMS not found")
  // The type annotation "NavItem[]" also contains "]"; anchor on the opening
  // "= [" so we skip the annotation and slice only the array literal body.
  const open = source.indexOf("=", start)
  const end = source.indexOf("]", open)
  if (end === -1) throw new Error("end of NAV_ITEMS array literal not found")
  const block = source.slice(open, end)
  const ids = []
  for (const m of block.matchAll(/id:\s*"([^"]+)"/g)) ids.push(m[1])
  return ids
}

const navSource = readFileSync(NAV_PATH, "utf8")
const guideSource = readFileSync(GUIDE_PATH, "utf8")

test("NAV_ITEMS is exactly the product-model containers of this version", () => {
  const ids = navItemIds(navSource)
  assert.deepEqual(ids, ["inicio", "explorar", "perfil"])
})

test("navigation item count respects the declared ceiling of five", () => {
  const ids = navItemIds(navSource)
  assert.ok(ids.length <= CEILING, `NAV_ITEMS has ${ids.length} items, ceiling ${CEILING}`)
})

test("no top-level nav tab for folded destinations", () => {
  const ids = navItemIds(navSource)
  // events/messages/indications never were containers; groups and cidade were
  // folded into comunidades/inicio by PROCESSO-DE-CONSTRUCAO §7.
  for (const forbidden of ["events", "messages", "indications", "groups", "cidade"]) {
    assert.ok(!ids.includes(forbidden), `"${forbidden}" must not be a top-level container`)
  }
})

test("DESIGN_SYSTEM §7.1 lists the same containers as NAV_ITEMS", () => {
  const ids = navItemIds(navSource)
  for (const id of ids) {
    // the spec marks each container id in backticks (e.g. `cidade`)
    assert.ok(guideSource.includes(`\`${id}\``), `container ${id} absent from VISUAL_GUIDE.md`)
  }
})
