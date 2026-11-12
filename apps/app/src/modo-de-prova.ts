/**
 * Andaime de prova.
 *
 * O modo de prova monta os controles que deixam a bateria medir navegação,
 * rolagem, foco, sobreposição e carga pendente (`ControlesDeProva`, na casca) e
 * a tela vazia de cada rota ainda sem jornada (`TelaDeProva`). O parecer cego de
 * 12/12 flagrou esse andaime no build publicado: rota sem jornada mostrava o
 * rodapé de depuração ("Liberar cargas pendentes", "Ir para o Mercado",
 * "Abrir item-N") em vez de um estado vazio de verdade.
 *
 * Regra: o modo de prova só existe no servidor de desenvolvimento (`DEV`). No
 * build de produção ele não liga nem com o global definido, e o andaime nunca
 * monta. As baterias que dependem do modo rodam contra `vite dev`.
 */

/** Só o servidor de desenvolvimento reconhece o modo de prova. */
export const ANDAIME_DISPONIVEL = import.meta.env.DEV

export type JanelaComModoDeProva = {
  __BIVAQUE_MODO_DE_PROVA__?: boolean
}

export function modoDeProvaAtivo(): boolean {
  if (!ANDAIME_DISPONIVEL) return false
  if (typeof window === "undefined") return false
  return (window as unknown as JanelaComModoDeProva).__BIVAQUE_MODO_DE_PROVA__ === true
}

/** Filtro de entrada que faz a lista montar só quando a prova liberar. */
export const FILTRO_SEGURAR_CARGA = "segurar-proxima-carga"
