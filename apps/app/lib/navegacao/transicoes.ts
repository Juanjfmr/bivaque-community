import { abaAtiva } from "./abas"
import {
  type EstadoDaEntrada,
  entradaPadrao,
  novaChaveDeEntrada,
  type Sobreposicao,
} from "./entrada"

/**
 * As decisões puras da navegação. Nenhuma delas toca o histórico: elas dizem
 * *o que* a entrada seguinte guarda e *se* a navegação substitui ou empilha.
 * Quem escreve no histórico é o roteador, na camada React.
 */

export type DecisaoDeNavegacao = {
  /** Substituir a entrada atual em vez de empilhar uma nova. */
  readonly replace: boolean
  readonly entrada: EstadoDaEntrada
}

/**
 * Abrir uma rota nova: guarda de onde a pessoa veio (`pai`) e herda como origem
 * a aba da tela atual. Com sobreposição aberta, substitui a entrada em vez de
 * empilhar — assim sair não deixa entrada fantasma.
 */
export function entrarEmRota(dados: {
  readonly atual: EstadoDaEntrada
  readonly rotaAtual: string
}): DecisaoDeNavegacao {
  const origem = abaAtiva(dados.rotaAtual, dados.atual.origem) ?? dados.atual.origem
  return {
    replace: dados.atual.sobreposicao !== null,
    entrada: entradaPadrao({ origem, pai: dados.rotaAtual }),
  }
}

/** Trocar filtro não navega: reescreve a entrada atual, sem empilhar. */
export function definirFiltro(
  atual: EstadoDaEntrada,
  chave: string,
  valor: string,
): EstadoDaEntrada {
  return { ...atual, filtros: { ...atual.filtros, [chave]: valor } }
}

export function limparFiltro(atual: EstadoDaEntrada, chave: string): EstadoDaEntrada {
  if (atual.filtros[chave] === undefined) return atual
  const filtros = { ...atual.filtros }
  delete filtros[chave]
  return { ...atual, filtros }
}

/**
 * Abrir uma sobreposição empilha uma entrada própria — com identidade nova, para
 * que voltar seja uma mudança de entrada de verdade. O descritor de quem a abriu
 * fica na entrada de baixo, e é ele que recebe o foco ao fechar.
 */
export function abrirSobreposicao(atual: EstadoDaEntrada, id: Sobreposicao): EstadoDaEntrada {
  return { ...atual, chave: novaChaveDeEntrada(), sobreposicao: id }
}

export type DecisaoDeVolta = {
  /** Descartar a entrada atual do histórico. */
  readonly popar: boolean
  /** Rota declarada de destino, quando não há pai na entrada. */
  readonly nome: string | null
}

/**
 * A decisão do Voltar, com prioridade: sobreposição aberta fecha antes de tudo;
 * havendo pai na entrada, é o histórico que volta (a entrada anterior é o pai);
 * sem pai (link direto), vai para o pai declarado da rota, dentro do app.
 */
export function voltar(atual: EstadoDaEntrada, paiDeclarado: string | null): DecisaoDeVolta {
  if (atual.sobreposicao !== null) return { popar: true, nome: null }
  if (atual.pai !== null) return { popar: true, nome: null }
  return { popar: false, nome: paiDeclarado }
}
