// FIGMA-001 — reparos finais (despacho Codex 06/10/2026): prova unitária da
// decisão pura por trás da navegação do painel do prestador. O Vitest da casa
// roda em node sem DOM, então o que se prova aqui é a regra que o componente
// aplica ao renderizar: exatamente UM aria-current por pathname, com o thread
// /prestador/conversas/<id> ativando Conversas (nunca dois itens marcados,
// nunca navegação sem item atual).

import { describe, expect, it } from "vitest"
import { activeProviderNavId, PROVIDER_NAV_ENTRIES } from "web/app/(provider)/provider-nav"

// A regra do componente: `aria-current={entry.id === activeId ? "page" : undefined}`.
// Contar os marcados a partir do id ativo é provar a conta que o DOM vai fazer.
function currentEntries(pathname: string) {
  const activeId = activeProviderNavId(pathname)
  return PROVIDER_NAV_ENTRIES.filter((entry) => entry.id === activeId)
}

describe("navegação do prestador: exatamente um aria-current", () => {
  it("cada rota do painel marca o próprio item", () => {
    expect(activeProviderNavId("/prestador")).toBe("painel")
    expect(activeProviderNavId("/prestador/conversas")).toBe("conversas")
    expect(activeProviderNavId("/prestador/ficha")).toBe("ficha")
    expect(activeProviderNavId("/prestador/catalogo")).toBe("catalogo")
    for (const pathname of [
      "/prestador",
      "/prestador/conversas",
      "/prestador/ficha",
      "/prestador/catalogo",
    ]) {
      expect(currentEntries(pathname)).toHaveLength(1)
    }
  })

  it("o thread ativa Conversas, não Painel nem dois itens", () => {
    // O id é o uuid real da conversa do dono (mesma disciplina do e2e).
    const thread = "/prestador/conversas/df65352c-4310-43b5-845c-8df084c07f08"
    expect(activeProviderNavId(thread)).toBe("conversas")
    expect(currentEntries(thread)).toHaveLength(1)
  })

  it("prefixo de segmento não vaza: /prestador/catalogacao não é catálogo", () => {
    // startsWith cru casaria "catalogo" em "catalogacao"; o sufixo "/" impede.
    // Sem correspondência específica, recai no container de chegada (Painel) —
    // exatamente um, como no shell do membro.
    expect(activeProviderNavId("/prestador/catalogacao")).toBe("painel")
    expect(activeProviderNavId("/prestador/conversas-antigas")).toBe("painel")
    expect(currentEntries("/prestador/catalogacao")).toHaveLength(1)
  })

  it("barra final e caminho fora do painel não deixam a nav sem atual", () => {
    expect(activeProviderNavId("/prestador/conversas/")).toBe("conversas")
    expect(activeProviderNavId("/prestador/ficha/")).toBe("ficha")
    // Fora do painel o layout nem renderiza, mas a função é total e honesta:
    // recai em Painel em vez de devolver "nenhum".
    expect(activeProviderNavId("/messages")).toBe("painel")
    expect(currentEntries("/messages")).toHaveLength(1)
  })

  it("as entradas são rotas reais do painel, sem href duplicado", () => {
    const hrefs = PROVIDER_NAV_ENTRIES.map((entry) => entry.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
    for (const href of hrefs) {
      expect(href === "/prestador" || href.startsWith("/prestador/")).toBe(true)
    }
    expect(PROVIDER_NAV_ENTRIES.map((entry) => entry.label)).toEqual([
      "Painel",
      "Conversas",
      "Minha ficha",
      "Catálogo e portfólio",
    ])
  })
})
