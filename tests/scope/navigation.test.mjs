import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

// ADR-20261023-comunidade-do-prototipo §"Navegação e estrutura" (aceito pelo
// dono em 2026-10-23) — a barra segue o protótipo, que substitui os quatro
// containers do PROCESSO-DE-CONSTRUCAO §7 (Início/Explorar/Comunidades/Perfil).
// Os containers passam a Início (home e descoberta), Comunidade (perguntas e
// respostas e grupos), Conversas (mensagens privadas) e Você (a pessoa).
// Este teste é a task: é a única coisa que impede a divergência entre spec e código voltar.
// (a) NAV_ITEMS tem exatamente esses quatro ids.
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

test("NAV_ITEMS is exactly the four product-model containers", () => {
  const ids = navItemIds(navSource)
  assert.deepEqual(ids, ["inicio", "comunidade", "conversas", "voce"])
})

test("navigation item count respects the declared ceiling of five", () => {
  const ids = navItemIds(navSource)
  assert.ok(ids.length <= CEILING, `NAV_ITEMS has ${ids.length} items, ceiling ${CEILING}`)
})

test("no top-level nav tab for folded destinations", () => {
  const ids = navItemIds(navSource)
  // events/indications never were containers; /groups (a aba da Comunidade) e
  // cidade seguem fora da barra. "Conversas" agora É um container (o protótipo
  // põe as mensagens na barra); o que não pode voltar é um item "messages".
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
