// GATILHOS SEM ROTULO — auditoria de producao (DS-006).
//
// O parecer R3 registrou dez gatilhos de overflow com rotulo generico e atribuiu
// o defeito ao `menuLabel` nao chegar ao DOM. A segunda metade estava errada e a
// medicao mostrou a causa real:
//
//   [menu] FEED: {"ariaLabel":"Acoes da publicacao"}  <- o menuLabel CHEGA
//   [gatilho] FEED   total 346, todos aria-label="Mais opcoes"
//   [gatilho] INDICACOES total 9, todos aria-label="Mais opcoes"
//
// O defeito e o nome acessivel do GATILHO (`data-slot="dropdown-trigger"`):
// identico em todos os itens, quem usa leitor de tela ouve "Mais opcoes" nove
// vezes na lista de indicacoes sem saber qual pedido — ou qual resposta — aquele
// botao abre (WCAG 2.4.6 / 4.1.2).
//
// O reparo nao e chumbar um aria-label: e dar ao chamador, que tem o contexto, o
// nome do que o gatilho abre. O prefixo "Mais opcoes" e obrigatorio —
// tests/e2e/reports-member-flow.spec.ts clica
// `getByRole("button", { name: "Mais opções" })` sem `exact: true`, e o
// Playwright casa nome por substring.

const MAX_IDENTIFICACAO = 48

/**
 * Trecho identificador do item: uma linha, sem espaco duplicado, cortado em
 * limite de palavra. Sem reticencias de proposito — nao ha o que ler em voz alta
 * alem do proprio texto visivel do item.
 */
export function accessibleSuffix(text: string, max: number = MAX_IDENTIFICACAO): string {
  const linha = text.replace(/\s+/g, " ").trim()
  if (linha.length <= max) return linha
  const corte = linha.slice(0, max)
  const ultimoEspaco = corte.lastIndexOf(" ")
  return (ultimoEspaco > 0 ? corte.slice(0, ultimoEspaco) : corte).trimEnd()
}

/**
 * Nome acessivel do gatilho de overflow: sempre comeca por "Mais opções" e
 * termina no que aquele botao especificamente abre. Sem texto identificador
 * (item corrompido), o nome continua sendo o do alvo — nunca um generico sem
 * sentido nem um rotulo vazio.
 */
export function overflowTriggerLabel(noun: string, text: string): string {
  const identificacao = accessibleSuffix(text)
  return identificacao.length > 0 ? `Mais opções ${noun}: ${identificacao}` : `Mais opções ${noun}`
}
