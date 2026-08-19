"use client"

import { Button, ButtonGroup, ToggleButton } from "@heroui/react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Database } from "supabase/database.generated"
import { useLocalityContext } from "../../../lib/locality-context"
import { isLocalityStale } from "../../../lib/locality-density"
import { createBrowserClient } from "../../../lib/supabase/client"
import { CityReference } from "../../components/bivaque/city-reference"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { FeedComposer } from "../../components/bivaque/feed-composer"
import { CreatePostModal, FeedPost } from "../../components/bivaque/feed-post"
import { FeedRightRail } from "../../components/bivaque/feed-right-rail"
import { FeedCardSkeleton } from "../../components/bivaque/skeleton"

type FeedPostRow = Database["public"]["Functions"]["feed_posts"]["Returns"][number]

export default function CommunityPage() {
  const [posts, setPosts] = useState<FeedPostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [defaultPostType, setDefaultPostType] = useState<string | undefined>(undefined)
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [primaryCommunityId, setPrimaryCommunityId] = useState<string | null>(null)
  const [primaryCommunityName, setPrimaryCommunityName] = useState<string | null>(null)
  const [hasResolved, setHasResolved] = useState(false)
  const [sortOrder, setSortOrder] = useState<"recent" | "relevant">("recent")
  const [transitioning, setTransitioning] = useState(false)
  const [atEnd, setAtEnd] = useState(false)
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set())

  const { current } = useLocalityContext()

  const searchParams = useSearchParams()
  const targetPostId = searchParams.get("post")
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null)
  const postRefs = useRef<Map<string, HTMLElement | null>>(new Map())
  const hasScrolledToDeepLink = useRef(false)

  const supabase = createBrowserClient()

  const loadFeed = useCallback(
    async (order: "recent" | "relevant" = sortOrder) => {
      setLoading(true)
      setError("")
      setAtEnd(false)

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
        setPosts([])
        setPrimaryCommunityId(null)
        setPrimaryCommunityName(null)
        setLoading(false)
        setHasResolved(true)
        return
      }

      const feed = await supabase.rpc("feed_community", {
        p_community_id: communityId,
        p_order: order,
      })

      if (feed.error) {
        setError("Não foi possível carregar as publicações. Tente novamente.")
        setLoading(false)
        return
      }

      const newPosts = (feed.data as unknown as FeedPostRow[]) ?? []
      setPosts(newPosts)
      setPrimaryCommunityId(communityId ?? null)
      setPrimaryCommunityName(communityName)
      setLoading(false)
      setHasResolved(true)

      if (newPosts.length === 0) {
        setAtEnd(false)
      }
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

  const handleOpenModal = useCallback((postType?: string) => {
    setDefaultPostType(postType)
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
      try {
        const { count } = await supabase
          .from("locality_memberships")
          .select("*", { count: "exact", head: true })
          .eq("locality_id", current.id)
        if (!cancelled && count !== null) {
          setMemberCount(count)
        }
      } catch {
        /* silently fail */
      }
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
              defaultPostType={defaultPostType}
              onCreated={handleCreated}
              onClose={() => {
                setShowCreateModal(false)
                setDefaultPostType(undefined)
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
                  {primaryCommunityName ?? "Manaus, AM"}
                </h1>
                {!primaryCommunityName && memberCount !== null && (
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
              beginning. The threshold is the locality member count, not Manaus. */}
              {!loading && !error && posts.length === 0 && (
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
                    <Button size="sm" variant="primary" onPress={() => handleOpenModal()}>
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

              {/* end-of-feed marker */}
              {!loading && !error && posts.length > 0 && !atEnd && (
                <p className="py-4 text-center text-sm text-muted"> Você está em dia</p>
              )}
            </div>

            {/* right rail */}
            <FeedRightRail />
          </div>

          {showCreateModal && (
            <CreatePostModal
              localityId={current.id}
              defaultPostType={defaultPostType}
              defaultCommunityId={primaryCommunityId ?? undefined}
              onCreated={handleCreated}
              onClose={() => {
                setShowCreateModal(false)
                setDefaultPostType(undefined)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
