"use client"

import { Button, ButtonGroup, ToggleButton } from "@heroui/react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Database } from "supabase/database.generated"
import { loadFeedPage } from "../../../lib/feed/feed-page-loader"
import { useFeedPagination } from "../../../lib/feed/use-feed-pagination"
import { useLocalityContext } from "../../../lib/locality-context"
import { isLocalityStale } from "../../../lib/locality-density"
import { createBrowserClient } from "../../../lib/supabase/client"
import { CityReference } from "../../components/bivaque/city-reference"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { FeedComposer } from "../../components/bivaque/feed-composer"
import { FEED_END_LABEL, FeedLoadMore } from "../../components/bivaque/feed-load-more"
import { CreatePostModal, FeedPost } from "../../components/bivaque/feed-post"
import {
  FeedRailDisclosure,
  FeedRightRail,
  useFeedRailData,
} from "../../components/bivaque/feed-right-rail"
import { FeedCardSkeleton } from "../../components/bivaque/skeleton"

type FeedPostRow = Database["public"]["Functions"]["feed_posts"]["Returns"][number]

export default function CommunityPage() {
  // FEED-PAGINACAO-CURSOR (rodada 2): a PRIMEIRA página é a que esta rota pede
  // quando abre — uma chamada, sem cursor, com o limite de página que o servidor
  // confere (teto de 50 dentro da função). As seguintes NÃO vêm junto: saem do
  // botão "Carregar mais", uma por vez, e o que já está na tela nunca é apagado
  // por uma falha delas.
  const [firstPage, setFirstPage] = useState<FeedPostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  // Dica da ENTRADA (o botão "Link" do compositor), não formato escolhido: o
  // `post_type` é derivado do anexo real dentro do CreatePostModal.
  const [entryAttachment, setEntryAttachment] = useState<string | undefined>(undefined)
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [memberCountError, setMemberCountError] = useState(false)
  const [primaryCommunityId, setPrimaryCommunityId] = useState<string | null>(null)
  const [primaryCommunityName, setPrimaryCommunityName] = useState<string | null>(null)
  const [hasResolved, setHasResolved] = useState(false)
  const [sortOrder, setSortOrder] = useState<"recent" | "relevant">("recent")
  const [transitioning, setTransitioning] = useState(false)
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set())

  const { current } = useLocalityContext()

  const searchParams = useSearchParams()
  const targetPostId = searchParams.get("post")
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null)
  const postRefs = useRef<Map<string, HTMLElement | null>>(new Map())
  const hasScrolledToDeepLink = useRef(false)

  const supabase = createBrowserClient()

  // Uma leitura só serve as duas montagens do trilho (a de >=1024px e o
  // disclosure do telefone). Ver useFeedRailData para por que ela não é portão.
  const railData = useFeedRailData()

  // A lista na tela é a página 1 desta rota MAIS o que o botão já trouxe, sem id
  // repetido (`appendFeedPage`). Trocar Recentes/Relevantes troca a página 1 e o
  // hook descarta o que foi acrescentado: recomeça do zero.
  const { posts, hasMore, loadingMore, loadMoreError, loadMore } = useFeedPagination<FeedPostRow>({
    communityId: primaryCommunityId,
    order: sortOrder,
    firstPage,
  })

  const loadFeed = useCallback(
    async (order: "recent" | "relevant" = sortOrder) => {
      setLoading(true)
      setError("")

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("Sessão expirada. Faça login novamente.")
        setLoading(false)
        setHasResolved(true)
        return
      }

      const { data: membershipsData, error: membershipsError } = await supabase
        .from("community_memberships")
        .select("community_id")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .order("joined_at", { ascending: true })
        .limit(1)

      if (membershipsError) {
        // Reading the error is not optional: silently swallowing it is how the
        // group member list rendered empty in production before — README §"Duas
        // coisas que o E2E ensinou".
        setError("Não foi possível identificar sua comunidade. Tente novamente.")
        setLoading(false)
        return
      }

      const communityId = ((membershipsData as { community_id: string }[] | null) ?? [])[0]
        ?.community_id

      let communityName: string | null = null
      if (communityId) {
        const { data: communityData, error: communityError } = await supabase
          .from("communities")
          .select("name")
          .eq("id", communityId)
          .maybeSingle()
        if (communityError) {
          setError("Não foi possível identificar sua comunidade. Tente novamente.")
          setLoading(false)
          return
        }
        communityName = (communityData as { name: string } | null)?.name ?? null
      }

      // Onda E Task 2: quando o membro não pertence a comunidade nenhuma, NÃO
      // caímos no feed_posts (Manhattan-reach). A home passa a ser a referência
      // da cidade (§6.2), renderizada por <CityReference />. O RPC feed_posts
      // continua existindo — profile/page.tsx:129 o usa e a Task 7 conserta.
      if (!communityId) {
        setFirstPage([])
        setPrimaryCommunityId(null)
        setPrimaryCommunityName(null)
        setLoading(false)
        setHasResolved(true)
        return
      }

      // Primeira página: sem cursor, limite de uma página. O par `created_at` +
      // `id` só entra na requisição quando existe página anterior.
      const feed = await loadFeedPage(supabase, { communityId, order })

      if (feed.status === "error") {
        setError(feed.message)
        setLoading(false)
        return
      }

      // Referência nova ⇒ o hook zera o que foi acrescentado e o cursor volta ao
      // fim desta página.
      setFirstPage(feed.posts as unknown as FeedPostRow[])
      setPrimaryCommunityId(communityId ?? null)
      setPrimaryCommunityName(communityName)
      setLoading(false)
      setHasResolved(true)
    },
    [sortOrder, supabase],
  )

  const handleSortChange = useCallback(
    (order: "recent" | "relevant") => {
      if (order === sortOrder) return
      setSortOrder(order)
      setTransitioning(true)
      loadFeed(order).finally(() => {
        setTransitioning(false)
      })
    },
    [sortOrder, loadFeed],
  )

  const handleOpenModal = useCallback((attachment?: string) => {
    setEntryAttachment(attachment)
    setShowCreateModal(true)
  }, [])

  const handleCreated = useCallback(() => {
    loadFeed(sortOrder).catch(() => {
      /* errors handled in loadFeed */
    })
  }, [loadFeed, sortOrder])

  const handleHidePost = useCallback((postId: string) => {
    setHiddenPostIds((prev) => new Set(prev).add(postId))
  }, [])

  const initialLoadDone = useRef(false)

  // load member count
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // D51: contar apenas memberships correntes e com acesso ativo. Linhas
      // leaving/read_only inflariam o contador "N membros" e o sinal de
      // densidade §3.4 (isLocalityStale) sem justificativa.
      const result = await supabase
        .from("locality_memberships")
        .select("*", { count: "exact", head: true })
        .eq("locality_id", current.id)
        .eq("kind", "current")
        .eq("access", "active")
      if (cancelled) return
      if (result.error) {
        // Distinguir erro de leitura de contagem zero: a UI oculta o chip
        // em vez de sugerir densidade que não conhecemos (DESIGN_SPEC §3.2).
        setMemberCountError(true)
        return
      }
      setMemberCount(result.count ?? 0)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, current.id])

  // initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      loadFeed(sortOrder)
    }
  }, [loadFeed, sortOrder])

  useEffect(() => {
    if (hasScrolledToDeepLink.current) return
    if (!targetPostId) return
    if (posts.length === 0) return

    const target = posts.find((p) => p.id === targetPostId)
    if (!target) return

    hasScrolledToDeepLink.current = true

    const raf = requestAnimationFrame(() => {
      const el = postRefs.current.get(targetPostId)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    })

    setHighlightedPostId(targetPostId)
    const timer = setTimeout(() => setHighlightedPostId(null), 2500)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [posts, targetPostId])

  return (
    <div className="flex flex-1 flex-col">
      {/* Onda E Task 2: quando o membro não pertence a nenhuma comunidade, a
          home é a referência da cidade (§6.2), não o feed da vila. O feed
          municipal é morto pela D48. CityReference é o mesmo conteúdo que a
          rota /localidade (Task 3) vai expor. O CreatePostModal continua
          disponível — o membro ainda pode publicar com alcance da cidade
          mesmo sem estar numa vila. */}
      {hasResolved && !primaryCommunityId && !error ? (
        <>
          <CityReference onPublish={() => handleOpenModal()} />
          {showCreateModal && (
            <CreatePostModal
              localityId={current.id}
              initialAttachment={entryAttachment}
              onCreated={handleCreated}
              onClose={() => {
                setShowCreateModal(false)
                setEntryAttachment(undefined)
              }}
            />
          )}
        </>
      ) : (
        <>
          {/* locality header — sticky under app header */}
          <div className="sticky top-12 z-30 border-b border-border bg-[var(--surface)] px-4 py-3">
            <div className="mx-auto flex max-w-[56rem] items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h1 className="text-lg font-semibold tracking-tight">
                  {primaryCommunityName ??
                    (current.cityName
                      ? current.stateCode
                        ? `${current.cityName}, ${current.stateCode}`
                        : current.cityName
                      : "Comunidade")}
                </h1>
                {!primaryCommunityName && memberCount !== null && !memberCountError && (
                  <span className="text-sm text-muted">
                    {memberCount} {memberCount === 1 ? "membro" : "membros"}
                  </span>
                )}
                {!primaryCommunityName && (
                  <a
                    href="/guide"
                    className="inline-flex min-h-11 min-w-11 items-center text-sm font-medium text-accent transition-colors hover:underline"
                  >
                    Guia de chegada
                  </a>
                )}
              </div>
              <Button size="sm" variant="primary" onPress={() => handleOpenModal()}>
                Publicar
              </Button>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[56rem] flex-1 gap-6 px-4 pt-4 pb-8">
            {/* feed column */}
            <div className="min-w-0 flex-1 space-y-3">
              {/* composer entry */}
              <FeedComposer onOpenModal={handleOpenModal} />

              {/* sort control */}
              <ButtonGroup
                variant="tertiary"
                fullWidth
                aria-label="Ordenar publicações"
                className="bg-[var(--surface-sunken)] p-1"
              >
                <ToggleButton
                  isSelected={sortOrder === "recent"}
                  onChange={() => handleSortChange("recent")}
                  className="min-h-11"
                >
                  Recentes
                </ToggleButton>
                <ToggleButton
                  isSelected={sortOrder === "relevant"}
                  onChange={() => handleSortChange("relevant")}
                  className="min-h-11"
                >
                  Relevantes
                </ToggleButton>
              </ButtonGroup>

              {/* Abaixo de 1024px o trilho não existe: o que ele carrega (eventos,
                  grupos e as regras) não aparece em nenhum outro lugar desta rota,
                  então desce fechado para a coluna do feed. Fechado porque o feed
                  não tem limite de itens — aberto por padrão, empurraria as
                  publicações para baixo de uma lista de contexto. */}
              <FeedRailDisclosure data={railData} />

              {/* error state */}
              {error && <ErrorState message={error} onRetry={() => loadFeed(sortOrder)} />}

              {/* skeleton loading */}
              {loading && !error && (
                <div className="space-y-2" aria-busy="true">
                  <FeedCardSkeleton />
                  <FeedCardSkeleton />
                  <FeedCardSkeleton />
                </div>
              )}

              {/* empty state — P0 Task 9: below the §3.4 density threshold the copy
              reads "Você é dos primeiros aqui" instead of "Nenhuma publicação
              ainda", because the second sentence describes a quiet room, not a
              beginning. The threshold is the locality member count, not Manaus.
              FEED-PAGINACAO-CURSOR: em `Relevantes` o vazio NÃO é o mesmo fato —
              a lista é limitada (7 dias, mínimo 1 comentário), então ela pode
              estar vazia numa comunidade cheia. Aí a copy diz isso e leva de
              volta para `Recentes`, que é onde o conteúdo está. */}
              {!loading && !error && posts.length === 0 && sortOrder === "relevant" && (
                <EmptyState
                  title="Não há nada em destaque nesta semana"
                  description="Nenhuma publicação dos últimos sete dias recebeu resposta ainda. As mais recentes continuam na aba Recentes."
                  action={
                    <Button
                      size="sm"
                      variant="primary"
                      className="min-h-11"
                      onPress={() => handleSortChange("recent")}
                    >
                      Ver as recentes
                    </Button>
                  }
                />
              )}

              {!loading && !error && posts.length === 0 && sortOrder === "recent" && (
                <EmptyState
                  title={
                    isLocalityStale(memberCount)
                      ? "Você é dos primeiros aqui."
                      : "Nenhuma publicação ainda"
                  }
                  description={
                    isLocalityStale(memberCount)
                      ? "Esta comunidade está começando. Publique algo para abrir caminho para quem chegar depois."
                      : "Seja o primeiro a compartilhar algo com a sua comunidade."
                  }
                  action={
                    <Button
                      size="sm"
                      variant="primary"
                      className="min-h-11"
                      onPress={() => handleOpenModal()}
                    >
                      Publicar
                    </Button>
                  }
                />
              )}

              {/* feed list */}
              {!loading && posts.length > 0 && (
                <div
                  className="space-y-2 transition-opacity"
                  style={{
                    opacity: transitioning ? 0.6 : 1,
                    transitionDuration: "var(--duration-fast)",
                  }}
                >
                  {posts
                    .filter((post) => !hiddenPostIds.has(post.id))
                    .map((post, index) => (
                      <div
                        key={post.id}
                        ref={(el) => {
                          if (el) {
                            postRefs.current.set(post.id, el)
                          } else {
                            postRefs.current.delete(post.id)
                          }
                        }}
                        className={
                          highlightedPostId === post.id
                            ? "rounded-lg ring-2 ring-accent transition-all duration-300"
                            : undefined
                        }
                      >
                        <FeedPost post={post} index={index} onHide={handleHidePost} />
                      </div>
                    ))}
                </div>
              )}

              {/* Fim da lista e página seguinte. Fica FORA do bloco da lista de
                  propósito: falha ao carregar a página seguinte mantém os
                  cartões que já estão na tela e só acrescenta a mensagem com
                  "Tentar novamente" abaixo deles. Enquanto houver página, o
                  marcador de fim NÃO aparece — dizer "você está em dia" com
                  mais publicações esperando seria falso. */}
              {!loading && !error && posts.length > 0 && (
                <FeedLoadMore
                  hasMore={hasMore}
                  loading={loadingMore}
                  error={loadMoreError}
                  onLoadMore={loadMore}
                  endLabel={
                    sortOrder === "relevant" ? "Fim dos destaques da semana" : FEED_END_LABEL
                  }
                />
              )}
            </div>

            {/* right rail */}
            <FeedRightRail data={railData} />
          </div>

          {showCreateModal && (
            <CreatePostModal
              localityId={current.id}
              initialAttachment={entryAttachment}
              defaultCommunityId={primaryCommunityId ?? undefined}
              onCreated={handleCreated}
              onClose={() => {
                setShowCreateModal(false)
                setEntryAttachment(undefined)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
