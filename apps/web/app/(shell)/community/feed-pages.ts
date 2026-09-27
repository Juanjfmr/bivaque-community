// O feed da Comunidade em páginas (25/09/2026). Antes, `feed_community`
// devolvia a comunidade inteira de uma vez (350 publicações na Vila Ajuricaba) e
// a tela montava todas. Agora a tela pede 20 por vez à própria função
// (`p_limit`/`p_offset`, migration 20260925213256), que escolhe a página antes
// de contar respostas e reações — o custo no banco é o da página, não o da
// comunidade — e carrega a próxima ao chegar no fim.
//
// A página é por deslocamento, não por cursor: a ordem "Relevantes" é por
// número de respostas, que não tem cursor estável. Publicação nova entre duas
// páginas desloca a lista uma posição — a junção abaixo descarta o repetido.

export const FEED_PAGE_SIZE = 20

/** Limite de páginas que a busca de um link direto (?post=) percorre sozinha. */
export const DEEP_LINK_MAX_PAGES = 10

/** Os parâmetros da função para a página que começa em `offset`. */
export function pageParams(
  offset: number,
  size = FEED_PAGE_SIZE,
): { p_limit: number; p_offset: number } {
  return { p_limit: size, p_offset: offset }
}

/** Junta a página nova ao fim, sem repetir o que já está na tela. */
export function appendPage<T extends { id: string }>(
  existing: readonly T[],
  page: readonly T[],
): T[] {
  const seen = new Set(existing.map((post) => post.id))
  return [...existing, ...page.filter((post) => !seen.has(post.id))]
}

/** Página cheia sugere que há mais; página curta é o fim. */
export function hasMoreAfter(pageLength: number, size = FEED_PAGE_SIZE): boolean {
  return pageLength >= size
}
