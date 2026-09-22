import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// RECON-043, defeito 1: a area "Seus eventos" nao pode renderizar rotulo de
// situacao sem painel, nem painel sem conteudo e sem estado vazio. O painel do
// react-aria so monta quando o `id` bate com a aba selecionada; um rotulo com
// `key` e sem `id` fica flutuando sobre area branca — que e exatamente o
// defeito medido. Um teste que so conferisse o texto novo nao pegaria isso,
// porque o texto ja existia no codigo e mesmo assim nao aparecia.

const root = join(import.meta.dirname, "..", "..", "..")
const eventsPage = readFileSync(
  join(root, "apps", "web", "app", "(shell)", "events", "page.tsx"),
  "utf8",
)

const SITUATIONS = [
  { id: "host", label: "Organizando" },
  { id: "going", label: "Confirmado" },
  { id: "interested", label: "Interessado" },
  { id: "invited", label: "Convidado" },
] as const

function panelFor(id: string): string {
  const start = eventsPage.indexOf(`<TabPanel id="${id}"`)
  if (start === -1) return ""
  const end = eventsPage.indexOf("</TabPanel>", start)
  return end === -1 ? "" : eventsPage.slice(start, end)
}

describe("RECON-043 — Seus eventos", () => {
  it("cada situacao tem aba e painel com o mesmo id (sem id o painel nao monta)", () => {
    for (const situation of SITUATIONS) {
      expect(eventsPage, `aba ${situation.id} sem id`).toMatch(
        new RegExp(
          `<Tabs\\.Tab[^>]*id="${situation.id}"[^>]*>\\s*${situation.label}\\s*</Tabs\\.Tab>`,
        ),
      )
      expect(panelFor(situation.id), `painel ${situation.id} ausente`).not.toBe("")
    }
  })

  it("cada painel tem conteudo ou um estado vazio declarado", () => {
    for (const situation of SITUATIONS) {
      expect(panelFor(situation.id), `painel ${situation.id} sem conteudo nem vazio`).toMatch(
        /<EmptyState|<OwnEventCard|<EventInvitesSection/,
      )
    }
  })

  it("a area declara o vazio no lugar dos rotulos quando nao ha evento proprio", () => {
    const emptyStateAt = eventsPage.indexOf("Nenhum evento seu ainda")
    expect(emptyStateAt, "o vazio da area nao tem frase").toBeGreaterThanOrEqual(0)

    const emptyStateBlock = eventsPage.slice(emptyStateAt, emptyStateAt + 700)
    expect(emptyStateBlock, "o vazio da area nao tem caminho de saida").toContain("<Button")
    expect(emptyStateBlock).toMatch(/onPress=/)

    // As abas so podem aparecer quando existe evento proprio; sem o guarda os
    // quatro rotulos voltam a flutuar sem painel.
    expect(eventsPage).toMatch(/hasOwnEvents\s*\?/)
  })
})
