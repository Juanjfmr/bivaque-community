import { rotaPorNome } from "./navegacao/rotas"

/**
 * As regras da casca por rota, puras (inventário §5).
 *
 * A casca tem três formas — app, entrada e painel do dono (§5, tabela "Onde a
 * casca muda por rota") — e, dentro da forma do app, a barra do topo, o chip de
 * cidade, os avisos, as conversas e a busca mudam conforme a rota. Aqui isso é
 * conta; quem desenha é `src/casca/`.
 */

export type AcoesDaBarra = {
  /** A rota usa a casca do app (barra do topo e navegação). */
  readonly barra: boolean
  /** Rota-raiz: mostra a marca em vez do botão Voltar (§5.2). */
  readonly marca: boolean
  readonly voltar: boolean
  /** Botão de avisos com contador — só na Início (§5.2). */
  readonly avisos: boolean
  /** Ícone de Conversas no topo, com contador (§3.1 do ADR). */
  readonly conversas: boolean
  /** Botão Buscar à direita, nas telas de dentro (§5.2). */
  readonly busca: boolean
  /** A rota `busca` toma a barra inteira com o campo (§5.2). */
  readonly buscaEmTelaCheia: boolean
  /** Rota-raiz, para a navegação de baixo e o Criar (§5.3). */
  readonly raiz: boolean
}

const ROTAS_COM_CASCA_PROPRIA = new Set(["entrar", "dono"])

export function acoesDaBarraDoTopo(nomeDaRota: string): AcoesDaBarra {
  const rota = rotaPorNome(nomeDaRota)
  const raiz = rota?.raiz ?? false
  const casca = rota?.casca ?? "app"
  const barra = casca === "app" && !ROTAS_COM_CASCA_PROPRIA.has(nomeDaRota)
  return {
    barra,
    raiz: barra && raiz,
    marca: barra && raiz,
    voltar: barra && !raiz,
    avisos: barra && nomeDaRota === "inicio",
    conversas: barra,
    busca: barra && !raiz && nomeDaRota !== "busca",
    buscaEmTelaCheia: barra && nomeDaRota === "busca",
  }
}

/**
 * §5.3: no celular a barra de baixo só aparece nas rotas-raiz
 * (`syncMobileNavigation`); a partir de 720 px ela é a coluna da esquerda e
 * nunca some.
 */
export function navegacaoVisivel(nomeDaRota: string, largura: number): boolean {
  if (largura >= 720) return true
  return rotaPorNome(nomeDaRota)?.raiz ?? false
}

/** §5.3: o Criar acompanha a barra de baixo. */
export function criaVisivel(nomeDaRota: string, largura: number): boolean {
  if (largura >= 720) return true
  return rotaPorNome(nomeDaRota)?.raiz ?? false
}

/** §5.2: vendo outra cidade, a faixa de visita aparece no alto do conteúdo. */
export function mostraFaixaDeVisita(vendoOutraCidade: boolean): boolean {
  return vendoOutraCidade
}

export function textoDaFaixaDeVisita(cidadeVista: string, cidadeDaPessoa: string): string {
  return `Você está conhecendo ${cidadeVista}. Sua cidade atual é ${cidadeDaPessoa}.`
}
