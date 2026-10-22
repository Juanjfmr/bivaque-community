"use client"

// PORT-001 (R73): o registro dos elementos `md-*` acontece só no cliente e só
// com os componentes que a landing usa (ADR-20261022, item 1). O import é
// dinâmico de propósito: o módulo do Material toca `HTMLElement` na avaliação,
// então importá-lo no topo quebraria a renderização no servidor. A promessa é
// guardada para o efeito de cada botão não repetir o import.
let registered: Promise<void> | undefined

export function registerLandingElements(): Promise<void> {
  registered ??= import("@material/web/button/filled-button.js").then(() => undefined)
  return registered
}
