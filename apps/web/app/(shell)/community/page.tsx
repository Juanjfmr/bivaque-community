"use client"

import { Button, ButtonGroup, ToggleButton } from "@heroui/react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Database } from "supabase/database.generated"
import { PILOT_LOCALITY_ID } from "../../../lib/locality"
import { createBrowserClient } from "../../../lib/supabase/client"
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
  const [sortOrder, setSortOrder] = useState<"recent" | "relevant">("recent")
  const [transitioning, setTransitioning] = useState(false)
  const [atEnd, setAtEnd] = useState(false)
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set())

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
        return
      }

      const { data, error: feedError } = await supabase.rpc("feed_posts", {
        p_locality_id: PILOT_LOCALITY_ID,
        p_order: order,
      })

      if (feedError) {
        setError("Não foi possível carregar as publicações. Tente novamente.")
        setLoading(false)
        return
      }

      const newPosts = (data as unknown as FeedPostRow[]) ?? []
      setPosts(newPosts)
      setLoading(false)

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
          .eq("locality_id", PILOT_LOCALITY_ID)
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
  }, [supabase])

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
      {/* locality header — sticky under app header */}
      <div className="sticky top-12 z-30 border-b border-border bg-[var(--surface)] px-4 py-3">
        <div className="mx-auto flex max-w-[56rem] items-center justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-semibold tracking-tight">Manaus, AM</h1>
            {memberCount !== null && (
              <span className="text-sm text-muted">
                {memberCount} {memberCount === 1 ? "membro" : "membros"}
              </span>
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

          {/* empty state */}
          {!loading && !error && posts.length === 0 && (
            <EmptyState
              title="Nenhuma publicação ainda"
              description="Seja o primeiro a compartilhar algo com a sua comunidade."
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
          localityId={PILOT_LOCALITY_ID}
          defaultPostType={defaultPostType}
          onCreated={handleCreated}
          onClose={() => {
            setShowCreateModal(false)
            setDefaultPostType(undefined)
          }}
        />
      )}
    </div>
  )
}
