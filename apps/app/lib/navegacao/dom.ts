import {
  CHAVE_DA_ENTRADA,
  type DescritorDeFoco,
  descritorDoElemento,
  entradaPadrao,
  temEntrada,
} from "./entrada"
import type { AmbienteDeRestauracao } from "./restauracao"

/**
 * Os verbos de DOM da navegação. O resto da camada é puro; aqui ficam as únicas
 * funções que conhecem documento, contêiner de rolagem e foco.
 */

export const ID_DO_CONTEUDO = "conteudo"

/**
 * Uma navegação nova para o endereço em que a pessoa já estava (endereço
 * digitado, link, aba) reusa a entrada do histórico, e o navegador traz junto o
 * estado que o documento anterior gravou nela. Só recarregar e voltar/avançar
 * entre documentos devolvem a mesma entrada; em qualquer outra navegação ela
 * começa padrão, sem os filtros de antes (NAV-001).
 *
 * Roda uma vez, antes de o roteador ler a localização inicial.
 */
export function esquecerEntradaDeOutroDocumento(): void {
  if (typeof performance === "undefined" || typeof history === "undefined") return
  const [navegacao] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
  if (navegacao?.type !== "navigate") return
  const estado: unknown = history.state
  if (!temEntrada(estado)) return
  const bruto = estado as Record<string, unknown>
  history.replaceState({ ...bruto, [CHAVE_DA_ENTRADA]: entradaPadrao() }, "")
}

export function conteudoDoDocumento(): HTMLElement | null {
  if (typeof document === "undefined") return null
  return document.getElementById(ID_DO_CONTEUDO)
}

export function rolagemAtual(): number {
  return conteudoDoDocumento()?.scrollTop ?? 0
}

export function alturaRolavelAtual(): number {
  const alvo = conteudoDoDocumento()
  if (!alvo) return 0
  return Math.max(0, alvo.scrollHeight - alvo.clientHeight)
}

/** O descritor de foco do que está focado agora, para a entrada guardar. */
export function descritorDoFocoAtual(): DescritorDeFoco | null {
  if (typeof document === "undefined") return null
  const ativo = document.activeElement
  if (!ativo || ativo === document.body) return null
  return descritorDoElemento(ativo)
}

function encontrar(seletor: string): Element | null {
  if (typeof document === "undefined") return null
  if (seletor.startsWith("#")) return document.getElementById(seletor.slice(1))
  return document.querySelector(seletor)
}

function visivel(elemento: Element): boolean {
  if (elemento.hasAttribute("hidden")) return false
  if (elemento.getClientRects().length === 0) return false
  if (elemento.closest("[inert]") !== null) return false
  const estilo = globalThis.getComputedStyle(elemento)
  return estilo.visibility !== "hidden" && estilo.visibility !== "collapse"
}

export function ambienteDoDocumento(): AmbienteDeRestauracao {
  return {
    scrollar(para) {
      const alvo = conteudoDoDocumento()
      if (alvo) alvo.scrollTop = para
    },
    encontrar,
    visivel,
    focar(elemento) {
      const alvo = elemento as HTMLElement
      if (typeof alvo.focus !== "function") return
      // Sem `preventScroll`, focar o título (que costuma estar fora da viewport
      // depois de restaurar a rolagem) traria a tela de volta ao topo e
      // destruiria a posição restaurada.
      alvo.focus({ preventScroll: true })
    },
  }
}
