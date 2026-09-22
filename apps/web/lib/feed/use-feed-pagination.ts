"use client"

// FEED-PAGINACAO-CURSOR — rodada 2 (TELA): o pedaço que os TRÊS chamadores
// compartilham entre a primeira página e o botão.
//
// Cada superfície carrega a PRIMEIRA página do seu jeito (a Home pelo loader da
// própria seção, `/community` pelo loader da rota, `/communities/[id]` já no
// SERVIDOR, dentro do HTML), e todas precisam da MESMA coisa depois dela: somar
// a página seguinte à lista, manter o que está na tela quando ela falha e
// recomeçar do zero quando a primeira página muda. Duplicar essa máquina em três
// arquivos é como as três divergem em silêncio.
//
// O hook não decide página — quem decide é `feed-pagination.ts` (função pura,
// com teste unitário próprio) e o servidor (`feed_community`, com teto de 50).
// Aqui só mora o estado do React, o cancelamento por geração — resposta
// atrasada de uma aba que já saiu não sobrescreve a lista da aba atual — e o
// contrato de FALHA: erro na página seguinte NUNCA limpa `posts`.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createBrowserClient } from "../supabase/client"
import { loadFeedPage } from "./feed-page-loader"
import {
  advanceFeedPageState,
  appendFeedPage,
  type FeedCursorRow,
  type FeedOrder,
  type FeedPageState,
  initialFeedPageState,
} from "./feed-pagination"

export interface UseFeedPaginationParams<T extends FeedCursorRow> {
  /** Comunidade cujo feed está na tela; `null` enquanto ela não foi resolvida. */
  communityId: string | null
  order: FeedOrder
  /**
   * A primeira página, do jeito que a superfície a obteve. Uma REFERÊNCIA nova
   * aqui significa "a lista recomeçou": o que foi acrescentado depois é
   * descartado e o cursor volta ao fim da página 1.
   */
  firstPage: readonly T[]
}

export interface UseFeedPaginationResult<T extends FeedCursorRow> {
  /** Página 1 + o que o botão já trouxe, sem id repetido. */
  posts: T[]
  hasMore: boolean
  loadingMore: boolean
  /** Mensagem da falha da página SEGUINTE; o feed segue na tela. */
  loadMoreError: string
  loadMore: () => void
  /** Descarta a mensagem de falha mantendo a lista (recomeço explícito). */
  clearLoadMoreError: () => void
}

export function useFeedPagination<T extends FeedCursorRow>({
  communityId,
  order,
  firstPage,
}: UseFeedPaginationParams<T>): UseFeedPaginationResult<T> {
  const [extra, setExtra] = useState<T[]>([])
  const [pageState, setPageState] = useState<FeedPageState>(() =>
    initialFeedPageState(firstPage, order),
  )
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState("")
  const generationRef = useRef(0)
  const supabase = createBrowserClient()

  // Primeira página nova (troca de aba/ordem, recarga, publicação criada) zera o
  // que foi acrescentado e aposenta qualquer resposta em voo: trocar entre
  // Recentes e Relevantes recomeça do ZERO — nunca "a página 1 da ordem nova mais
  // o resto da ordem anterior".
  // biome-ignore lint/correctness/useExhaustiveDependencies: communityId só é gatilho de contexto — trocar de comunidade também recomeça, mesmo sem ser lido aqui
  useEffect(() => {
    generationRef.current += 1
    setExtra([])
    setPageState(initialFeedPageState(firstPage, order))
    setLoadMoreError("")
    setLoadingMore(false)
  }, [firstPage, order, communityId])

  const loadMore = useCallback(() => {
    if (communityId === null) return
    if (loadingMore) return
    if (!pageState.hasMore) return

    generationRef.current += 1
    const generation = generationRef.current
    setLoadingMore(true)
    setLoadMoreError("")

    void loadFeedPage(supabase, { communityId, order, cursor: pageState.cursor }).then(
      (outcome) => {
        if (generationRef.current !== generation) return
        setLoadingMore(false)

        if (outcome.status === "error") {
          // O que já está na tela NÃO é tocado. Só a mensagem entra, e ela vem com
          // "Tentar novamente" — a lista continua inteira acima.
          setLoadMoreError(outcome.message)
          return
        }

        const received = outcome.posts as unknown as T[]
        setExtra((previous) => appendFeedPage(previous, received))
        setPageState((previous) => advanceFeedPageState(previous, received, order))
      },
    )
  }, [communityId, order, pageState.cursor, pageState.hasMore, loadingMore, supabase])

  const clearLoadMoreError = useCallback(() => setLoadMoreError(""), [])

  // A lista é a união das duas partes com id único — a mesma garantia que o e2e
  // cobra contando os cartões.
  const posts = useMemo(() => appendFeedPage(firstPage, extra), [firstPage, extra])

  return {
    posts,
    hasMore: pageState.hasMore,
    loadingMore,
    loadMoreError,
    loadMore,
    clearLoadMoreError,
  }
}
