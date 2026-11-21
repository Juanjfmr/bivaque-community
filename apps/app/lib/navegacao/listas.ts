import type { MudancaDaEntrada } from "./entrada"

/**
 * O estado que uma lista guarda na própria entrada do histórico (NAV-001): a
 * aba, os filtros e o texto de busca. É o mesmo campo que a categoria de
 * Negócios já usa (`EstadoDaEntrada.filtros`), então voltar de um detalhe
 * devolve a tela como estava — sem URL nova e sem estado global.
 */

export type FiltrosDaEntrada = Readonly<Record<string, string>>

/** Um valor guardado, aceito só se ainda for uma opção da tela. */
export function lerDaLista(
  filtros: FiltrosDaEntrada,
  chave: string,
  permitidos: readonly string[],
  padrao: string,
): string {
  const valor = filtros[chave]
  return valor !== undefined && permitidos.includes(valor) ? valor : padrao
}

/** Texto livre guardado (busca da tela), sem lista de opções. */
export function lerTextoDaLista(filtros: FiltrosDaEntrada, chave: string): string {
  return filtros[chave] ?? ""
}

/** A reescrita da entrada que troca um filtro da lista. */
export function mudancaDaLista(chave: string, valor: string): MudancaDaEntrada {
  return { filtros: { [chave]: valor } }
}

/**
 * A lista pode devolver a rolagem guardada? Quando o dado chegou ou quando a
 * falha já tem tela própria: antes disso o contêiner está curto e a posição
 * voltaria a zero.
 */
export function listaPronta(carregando: boolean, falhou: boolean): boolean {
  return !carregando || falhou
}
