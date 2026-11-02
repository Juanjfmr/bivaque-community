/**
 * Modo de prova (onda 1b).
 *
 * Os controles que abrem sobreposição, seguram a carga da lista e liberam
 * cargas pendentes só existem quando a prova liga este modo. A navegação que a
 * prova mede é a de verdade: mesmas rotas, mesma barra, mesmo histórico.
 * Ninguém liga isto no uso normal, e o modo não mexe no estado do histórico.
 */
export type JanelaComModoDeProva = {
  __BIVAQUE_MODO_DE_PROVA__?: boolean
}

export function modoDeProvaAtivo(): boolean {
  if (typeof window === "undefined") return false
  return (window as unknown as JanelaComModoDeProva).__BIVAQUE_MODO_DE_PROVA__ === true
}

/** Filtro de entrada que faz a lista montar só quando a prova liberar. */
export const FILTRO_SEGURAR_CARGA = "segurar-proxima-carga"
