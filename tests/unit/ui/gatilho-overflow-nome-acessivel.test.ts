import { describe, expect, it } from "vitest"

// GATILHOS SEM ROTULO — auditoria de producao (DS-006).
//
// O parecer R3 registrou rotulo generico nos gatilhos de overflow e atribuiu a
// causa ao `menuLabel` nao chegar ao DOM. A medicao mostrou o contrario: o
// menuLabel chega ("Acoes do pedido"), e o defeito esta no nome acessivel do
// GATILHO (`data-slot="dropdown-trigger"`), identico em todos os itens.
//
// Teste em duas camadas: o comportamento do rotulo (unidade) e a fiacao do
// chamador (fonte), porque foi a fiacao que faltou.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { accessibleSuffix, overflowTriggerLabel } from "web/lib/recommendations/trigger-label"

const root = join(import.meta.dirname, "..", "..", "..")
const componente = join(
  root,
  "apps",
  "web",
  "app",
  "components",
  "bivaque",
  "recommendation-requests.tsx",
)
const menu = join(root, "apps", "web", "app", "components", "bivaque", "feed-post-menu.tsx")
const cartaoDoFeed = join(root, "apps", "web", "app", "components", "bivaque", "feed-post-card.tsx")

const TITULO = "Preciso de um pedreiro para reparar o muro"

describe("nome acessivel do gatilho de overflow", () => {
  it("diz qual item o botao abre e mantem o prefixo que o e2e clica", () => {
    const rotulo = overflowTriggerLabel("do pedido", TITULO)
    expect(rotulo).toBe(`Mais opções do pedido: ${TITULO}`)
    // tests/e2e/reports-member-flow.spec.ts clica name "Mais opções" sem `exact`.
    expect(rotulo.startsWith("Mais opções")).toBe(true)
    expect(rotulo).not.toBe("Mais opções")
    expect(overflowTriggerLabel("da resposta", "Falo com o Nivaldo, ele faz esse servico")).toBe(
      "Mais opções da resposta: Falo com o Nivaldo, ele faz esse servico",
    )
  })

  it("nao repete o mesmo nome em dois itens distintos da lista", () => {
    const um = overflowTriggerLabel("do pedido", TITULO)
    const outro = overflowTriggerLabel("do pedido", "Alguem conhece um bom encanador")
    const resposta = overflowTriggerLabel("da resposta", "Falo com o Nivaldo")
    expect(new Set([um, outro, resposta]).size).toBe(3)
  })

  it("corta identificacao longa em limite de palavra, sem reticencias", () => {
    const longo = "a".repeat(30) + " " + "b".repeat(40)
    const sufixo = accessibleSuffix(longo)
    expect(sufixo.length).toBeLessThanOrEqual(48)
    expect(sufixo).toBe("a".repeat(30))
    expect(sufixo).not.toContain("…")
    expect(overflowTriggerLabel("do pedido", longo).startsWith("Mais opções do pedido: ")).toBe(true)
  })

  it("item sem texto identificador nao vira rotulo vazio nem generico sem alvo", () => {
    expect(overflowTriggerLabel("da resposta", "   ")).toBe("Mais opções da resposta")
    expect(accessibleSuffix("\n  texto   em\n duas linhas ")).toBe("texto em duas linhas")
  })
})

describe("fiacao do chamador", () => {
  const fonte = readFileSync(componente, "utf8")
  const fonteMenu = readFileSync(menu, "utf8")

  it("pedido e resposta passam triggerLabel especifico (era o que faltava)", () => {
    const rotulos = [...fonte.matchAll(/triggerLabel=\{([^}]*)\}/g)].map((m) => m[1] ?? "")
    expect(rotulos.length).toBe(2)
    expect(rotulos.some((r) => r.includes('overflowTriggerLabel("do pedido", request.title)'))).toBe(
      true,
    )
    expect(rotulos.some((r) => r.includes('overflowTriggerLabel("da resposta", reply.body)'))).toBe(
      true,
    )
    // Os dois gatilhos do arquivo sao os dois que recebem rotulo.
    expect((fonte.match(/<LeanOverflowMenu/g) ?? []).length).toBe(rotulos.length)
  })

  it("o default do componente compartilhado continua exatamente 'Mais opções'", () => {
    expect(fonteMenu).toContain('triggerLabel = "Mais opções"')
    expect(fonteMenu).toContain("aria-label={triggerLabel}")
    expect(fonteMenu).not.toContain("!important")
  })

  it("o feed permanece generico porque esta fora de allowed_paths (BLOCKED)", () => {
    const fonteCartao = readFileSync(cartaoDoFeed, "utf8")
    // Um unico ponto de montagem no cartao de publicacao, que renderiza 346
    // gatilhos no feed — arquivo fora do escopo desta tarefa.
    expect((fonteCartao.match(/<LeanOverflowMenu/g) ?? []).length).toBe(1)
    expect(fonteCartao).not.toContain("triggerLabel")
  })
})