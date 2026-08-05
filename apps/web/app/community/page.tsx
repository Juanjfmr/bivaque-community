"use client"

import { Button } from "@heroui/react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Database } from "supabase/database.generated"
import { createBrowserClient } from "../../lib/supabase/client"
import { EmptyState } from "../components/bivaque/empty-state"
import { ErrorState } from "../components/bivaque/error-state"
import { FeedComposer } from "../components/bivaque/feed-composer"
import { CreatePostModal, FeedPost } from "../components/bivaque/feed-post"
import { FeedRightRail } from "../components/bivaque/feed-right-rail"
import { FeedCardSkeleton } from "../components/bivaque/skeleton"

type FeedPostRow = Database["public"]["Functions"]["feed_posts"]["Returns"][number]

const MANAUS_LOCALITY_ID = "00000000-0000-4000-8000-000000000001"

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
        setError("Sessao expirada. Faca login novamente.")
        setLoading(false)
        return
      }

      const { data, error: feedError } = await supabase.rpc("feed_posts", {
        p_locality_id: MANAUS_LOCALITY_ID,
        p_order: order,
      })

      if (feedError) {
        setError("Nao foi possivel carregar as publicacoes. Tente novamente.")
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

  const initialLoadDone = useRef(false)

  // load member count
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { count } = await supabase
          .from("locality_memberships")
          .select("*", { count: "exact", head: true })
          .eq("locality_id", MANAUS_LOCALITY_ID)
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
          <div
            role="tablist"
            aria-label="Ordenar publicacoes"
            className="flex gap-1 rounded-lg bg-[var(--surface-sunken)] p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={sortOrder === "recent"}
              onClick={() => handleSortChange("recent")}
              className={`flex-1 min-h-11 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-[var(--duration-instant)] ${
                sortOrder === "recent"
                  ? "bg-[var(--surface)] shadow-[var(--elevation-1)]"
                  : "text-muted hover:bg-[var(--surface-subtle)]"
              }`}
            >
              Recentes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sortOrder === "relevant"}
              onClick={() => handleSortChange("relevant")}
              className={`flex-1 min-h-11 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-[var(--duration-instant)] ${
                sortOrder === "relevant"
                  ? "bg-[var(--surface)] shadow-[var(--elevation-1)]"
                  : "text-muted hover:bg-[var(--surface-subtle)]"
              }`}
            >
              Relevantes
            </button>
          </div>

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
              title="Nenhuma publicacao ainda"
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
              {posts.map((post, index) => (
                <FeedPost key={post.id} post={post} index={index} />
              ))}
            </div>
          )}

          {/* end-of-feed marker */}
          {!loading && !error && posts.length > 0 && !atEnd && (
            <p className="py-4 text-center text-sm text-muted">Voce esta em dia</p>
          )}
        </div>

        {/* right rail */}
        <FeedRightRail />
      </div>

      {showCreateModal && (
        <CreatePostModal
          localityId={MANAUS_LOCALITY_ID}
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
