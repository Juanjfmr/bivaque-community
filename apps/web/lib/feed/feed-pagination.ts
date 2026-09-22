// FEED-PAGINACAO-CURSOR — rodada 2 (TELA): o cursor como FUNÇÃO PURA.
//
// A rodada 1 (20260922103620_feed_community_cursor_pagination.sql) entregou o
// cursor no servidor: `public.feed_community` recebe o PAR `created_at` + `id` e
// devolve UMA página. O que a tela faz com esse par — montar o cursor a partir da
// última linha recebida, avançá-lo e decidir se ainda há páginas — é lógica sem
// I/O, sem DOM e sem React, e por isso vive aqui: é a parte da paginação que erra
// em SILÊNCIO. Cursor que não anda repete cartão; cursor que anda demais pula
// cartão; os dois passariam por um e2e mais frouxo.
//
// Nada neste arquivo importa React, Supabase ou DOM — só tipos primitivos. O
// ambiente node do Vitest da casa (sem jsdom, sem testing-library, que aqui não
// se adicionam) importa este módulo direto.
//
// LIMITE DESTA PROVA: aqui se prova a ARITMÉTICA do cursor. Que o servidor
// devolva páginas disjuntas é pgTAP (`supabase/tests/feed-community-pagination.sql`,
// rodada 1); que a tela peça a página seguinte e mantenha o feed na falha é e2e
// (`tests/e2e/feed-pagination.spec.ts`).

/** Tamanho de UMA página pedida pela tela. O TETO de 50 é do servidor. */
export const FEED_PAGE_SIZE = 20

/**
 * `recent` é fluxo paginado por cursor. `relevant` é LISTA LIMITADA (ADR-20260922):
 * 7 dias, no máximo 20 posts, mínimo 1 comentário — e sem rolagem.
 */
export type FeedOrder = "recent" | "relevant"

/** O mínimo de que o cursor precisa: o par que o servidor ORDENA. */
export interface FeedCursorRow {
  id: string
  created_at: string
}

/** O par `created_at` + `id`. O id sozinho é `gen_random_uuid()`, sem ordem. */
export interface FeedCursor {
  createdAt: string
  id: string
}

export interface FeedPageState {
  /** Cursor da última linha recebida; `null` enquanto nenhuma página chegou. */
  cursor: FeedCursor | null
  /** `true` enquanto o servidor puder ter mais uma página para este pedido. */
  hasMore: boolean
}

export const EMPTY_FEED_PAGE_STATE: FeedPageState = Object.freeze({
  cursor: null,
  hasMore: false,
})

/** Sem rolagem infinita em `Relevantes`: a lista limitada não pagina. */
export function feedOrderPaginates(order: FeedOrder): boolean {
  return order === "recent"
}

/**
 * O cursor sai da ÚLTIMA linha recebida — a mesma ponta que o `order by` usou.
 * Lista vazia não tem de onde montar cursor: devolve `null`, nunca um par
 * inventado (um par inventado faria a página seguinte repetir ou pular).
 */
export function cursorFromLastRow(rows: readonly FeedCursorRow[]): FeedCursor | null {
  const last = rows.length > 0 ? rows[rows.length - 1] : undefined
  if (!last) return null
  return { createdAt: last.created_at, id: last.id }
}

/**
 * Avança o estado a partir da página recém-recebida.
 *
 * - página CHEIA (`length >= pageSize`) ⇒ o servidor ainda pode ter mais, e o
 *   cursor passa a apontar para a última linha dela;
 * - página CURTA ou VAZIA ⇒ acabou: `hasMore` falso, e o cursor NÃO anda (não há
 *   de onde);
 * - ordem `relevant` ⇒ nunca pagina, qualquer que seja o tamanho da lista.
 */
export function advanceFeedPageState(
  previous: FeedPageState,
  received: readonly FeedCursorRow[],
  order: FeedOrder = "recent",
  pageSize: number = FEED_PAGE_SIZE,
): FeedPageState {
  if (!feedOrderPaginates(order)) return EMPTY_FEED_PAGE_STATE
  const cursor = cursorFromLastRow(received)
  return {
    cursor: cursor ?? previous.cursor,
    hasMore: cursor !== null && received.length >= pageSize,
  }
}

/**
 * Estado depois da PRIMEIRA página, que é a que chega no carregamento inicial
 * (na rota de comunidade, renderizada no servidor). Uma página 1 cheia já nasce
 * com `hasMore` — é o que faz o botão `Carregar mais` existir sem uma segunda
 * consulta de sondagem.
 */
export function initialFeedPageState(
  firstPage: readonly FeedCursorRow[],
  order: FeedOrder = "recent",
  pageSize: number = FEED_PAGE_SIZE,
): FeedPageState {
  return advanceFeedPageState(EMPTY_FEED_PAGE_STATE, firstPage, order, pageSize)
}

/**
 * Acrescenta uma página ao que já está na tela, sem repetir id.
 *
 * Duas defesas, nesta ordem: o servidor já não repete (o predicado do cursor é
 * estrito e as fixtures provam o intervalo), e o cliente ainda assim descarta id
 * repetido antes de virar chave de React. Um id repetido no DOM é uma chave
 * duplicada — e a segunda cópia substituiria a primeira em silêncio.
 *
 * A ordem recebida é preservada: a lista é o feed, não um conjunto.
 */
export function appendFeedPage<T extends FeedCursorRow>(
  current: readonly T[],
  incoming: readonly T[],
): T[] {
  const seen = new Set(current.map((row) => row.id))
  const merged: T[] = [...current]
  for (const row of incoming) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    merged.push(row)
  }
  return merged
}
