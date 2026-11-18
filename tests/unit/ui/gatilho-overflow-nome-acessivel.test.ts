import { describe, expect, it } from "vitest"

// GATILHOS SEM ROTULO — auditoria de producao (DS-006).
//
// O parecer R3 registrou rotulo generico nos gatilhos de overflow e atribuiu a
// causa ao `menuLabel` nao chegar ao DOM. A medicao mostrou o contrario: o
// menuLabel chega ("Acoes do pedido"), e o defeito esta no nome acessivel do
// GATILHO (`data-slot="dropdown-trigger"`), identico em todos os itens.
//
// Teste em duas camadas: o comportamento do rotulo (unidade) e a fiacao do
// chamador (fonte), porque foi a fiacao que faltou. Desde 25/09/2026 o chamador
// e a tela de detalhe das indicacoes (ADR-20260925-memoria-de-indicacoes).

import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dirname, "..", "..", "..")
const menuDoFeed = join(root, "apps", "web", "app", "components", "bivaque", "feed-post-menu.tsx")
const cartaoDoFeed = join(root, "apps", "web", "app", "components", "bivaque", "feed-post-card.tsx")

describe("fiacao do chamador", () => {
  it("o default do componente compartilhado do feed continua exatamente 'Mais opções'", () => {
    const fonteFeed = readFileSync(menuDoFeed, "utf8")
    expect(fonteFeed).toContain('triggerLabel = "Mais opções"')
    expect(fonteFeed).toContain("aria-label={triggerLabel}")
    expect(fonteFeed).not.toContain("!important")
  })

  it("o feed permanece generico porque esta fora de allowed_paths (BLOCKED)", () => {
    const fonteCartao = readFileSync(cartaoDoFeed, "utf8")
    // Um unico ponto de montagem no cartao de publicacao, que renderiza 346
    // gatilhos no feed — arquivo fora do escopo desta tarefa.
    expect((fonteCartao.match(/<LeanOverflowMenu/g) ?? []).length).toBe(1)
    expect(fonteCartao).not.toContain("triggerLabel")
  })
})
