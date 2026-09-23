// Auxiliar das varreduras de fonte do DS-006.
//
// Vários testes deste lote olham o TEXTO do fonte para provar ausência (nada de
// polegar, nada de vínculo de curadoria que o servidor não prova). O fonte
// documenta essas proibições em comentários — e o comentário que explica a
// proibição derrubava a asserção. A varredura certa mira código, não
// documentação: os comentários saem antes da comparação, e o uso real (JSX,
// string renderizada, chamada de cliente) continua sendo pego.

/** Remove `/* … *\/` (inclusive `{/* … *\/}` de JSX) e `// …` de fim de linha. */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1")
}
