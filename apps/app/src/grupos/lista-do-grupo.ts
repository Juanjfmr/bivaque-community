import {
  buscarGrupo,
  contarPublicacoes,
  type OrdemDoGrupo,
  type PublicacaoReal,
} from "@/lib/dados/grupos"

/** A primeira página de leitura do grupo exibida antes da publicação nova. */
export type PrimeiraPaginaDoGrupo = Readonly<{
  publicacoes: readonly PublicacaoReal[]
  proximo: string | null
}>

/**
 * A ordenação põe a publicação mais nova no topo, então só nela a página de
 * cima muda quando alguém publica. As outras ordenam pelo que os outros
 * fizeram (comentários, gravadas, ocultadas) e não têm como reordenar aqui.
 */
export function retemOTopo(ordem: OrdemDoGrupo): boolean {
  return ordem === "recentes" || ordem === "salvas"
}

/**
 * Onde a publicação recém-criada entra na lista do grupo (F03, critério 1).
 *
 * A tela volta para o mesmo lugar em que estava: a publicação entra como
 * primeiro item da lista exibida, sem recarregar o grupo e sem mudar a
 * ordenação que a pessoa escolheu. Duas regras:
 *
 * - `recentes` (e o topo de `salvas`): com o cursor da primeira página na
 *   mão, a página de cima é relida e a publicação entra no começo dela — a
 *   leitura por cursor continua casando com o resto da lista;
 * - as demais ordenações e as páginas seguintes não têm como reordenar por
 *   conta própria: a publicação entra no começo do que está na tela.
 *
 * A publicação nunca duplica: se a leitura já a trouxe, a página nova manda.
 */
export function comPublicacaoRecente(
  atual: readonly PublicacaoReal[],
  publicacao: PublicacaoReal,
  primeira: PrimeiraPaginaDoGrupo | null,
): readonly PublicacaoReal[] {
  const semRepetida = atual.filter((p) => p.id !== publicacao.id)
  if (primeira === null) return [publicacao, ...semRepetida]
  const relida = primeira.publicacoes.filter((p) => p.id !== publicacao.id)
  return [publicacao, ...relida]
}

/** A primeira página como estava antes da primeira publicação desta visita. */
type BaseDaLista = Readonly<{ ordem: OrdemDoGrupo; proximo: string | null }>

export type Colocacao = Readonly<{
  /** A primeira página relida na ordenação atual quando o topo é dela. */
  anterior: PrimeiraPaginaDoGrupo
  /** Cursor novo, quando a publicação abriu uma página nova. */
  proximo: string | null
  /**
   * A publicação está de fato na lista como primeiro item. `false` quando a
   * ordenação não põe a mais nova no topo ou quando a conferência não a achou.
   */
  entraNaLista: boolean
}>

/**
 * Confere onde a publicação recém-criada entra, lendo o que o servidor já
 * mostra. Três leituras no pior caso, e só na ordenação que ordena pela mais
 * nova — nas demais, a publicação entra no começo do que está na tela.
 *
 * - relê a página de cima: o cartão novo precisa do autor e da hora;
 * - com cursor, confere se a publicação abriu uma página nova: a primeira
 *   página maior que antes desloca um item para a segunda;
 * - se deslocou, procura a publicação na página que o cursor novo abre.
 *
 * Erro de leitura sobe: quem chama anuncia o que aconteceu, sem inventar
 * que a publicação aparece.
 */
export async function colocarNaLista(
  id: string,
  criada: { publicacao: PublicacaoReal; proximo: string | null },
  base: BaseDaLista | null,
  ordem: OrdemDoGrupo,
  opcoes: { readonly signal?: AbortSignal } = {},
): Promise<Colocacao | null> {
  if (base === null || base.ordem !== ordem || !retemOTopo(ordem)) return null
  const relida = await buscarGrupo(id, { ordem, ...opcoes })
  // Sem segunda página depois desta publicação, nada pode fugir da lista.
  if (criada.proximo === null || relida.proximo === null) {
    return { anterior: relida, proximo: null, entraNaLista: true }
  }
  const quantos = await contarPublicacoes(id, { ordem, ...opcoes })
  if (quantos <= relida.publicacoes.length) {
    return { anterior: relida, proximo: relida.proximo, entraNaLista: true }
  }
  const proxima = await buscarGrupo(id, {
    ordem,
    depois: relida.proximo,
    ...(opcoes.signal === undefined ? {} : { signal: opcoes.signal }),
  })
  if (proxima.publicacoes.some((p) => p.id === criada.publicacao.id)) {
    return { anterior: relida, proximo: proxima.proximo, entraNaLista: true }
  }
  return { anterior: relida, proximo: relida.proximo, entraNaLista: false }
}

/** A publicação que acabou de entrar é o primeiro item da lista exibida. */
export function estaPrimeira(publicacoes: readonly PublicacaoReal[], id: string | null): boolean {
  return id !== null && publicacoes[0]?.id === id
}

/** A frase que leva o leitor de tela até a publicação que acabou de entrar. */
export function anuncioDaPublicacao(publicacoes: readonly PublicacaoReal[], id: string): string {
  const posicao = publicacoes.findIndex((p) => p.id === id)
  if (posicao < 0) return "Publicação enviada."
  return posicao === 0
    ? "Publicação enviada. Ela está no começo da lista do grupo."
    : `Publicação enviada. Ela está na posição ${posicao + 1} da lista do grupo.`
}
