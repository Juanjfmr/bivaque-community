"use client"

import { Button } from "@heroui/react"
import { useCallback, useEffect, useState } from "react"
import type { Database } from "supabase/database.generated"
import { createBrowserClient } from "../../lib/supabase/client"
import { EmptyState } from "../components/bivaque/empty-state"
import { CreatePostModal, FeedPost } from "../components/bivaque/feed-post"
import { FeedCardSkeleton } from "../components/bivaque/skeleton"

type FeedPostRow = Database["public"]["Functions"]["feed_posts"]["Returns"][number]

const MANAUS_LOCALITY_ID = "00000000-0000-4000-8000-000000000001"

export default function CommunityPage() {
  const [posts, setPosts] = useState<FeedPostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)

  const loadFeed = useCallback(async () => {
    setLoading(true)
    setError("")

    const supabase = createBrowserClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError("Sessão expirada. Faça login novamente.")
      setLoading(false)
      return
    }

    const { data, error: feedError } = await supabase.rpc("feed_posts", {
      p_locality_id: MANAUS_LOCALITY_ID,
      p_order: "recent",
    })

    if (feedError) {
      setError(feedError.message)
    } else if (data) {
      setPosts(data as unknown as FeedPostRow[])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-12 z-30 border-b border-border bg-[var(--surface)] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Minha comunidade</h1>
          <Button size="sm" variant="primary" onPress={() => setShowCreateModal(true)}>
            Publicar
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        {error && (
          <div className="mb-4 rounded-md border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3 py-6" aria-busy="true">
            <FeedCardSkeleton />
            <FeedCardSkeleton />
            <FeedCardSkeleton />
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <EmptyState
            title="Nenhuma publicacao ainda"
            description="Seja o primeiro a compartilhar algo com a sua comunidade."
            action={
              <Button size="sm" variant="primary" onPress={() => setShowCreateModal(true)}>
                Publicar
              </Button>
            }
          />
        )}

        {!loading && posts.length > 0 && (
          <div className="space-y-3">
            {posts.map((post, index) => (
              <FeedPost key={post.id} post={post} index={index} />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreatePostModal
          localityId={MANAUS_LOCALITY_ID}
          onCreated={loadFeed}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  )
}
