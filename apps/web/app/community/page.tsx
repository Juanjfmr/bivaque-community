"use client"

import { brandTokens } from "@bivaque/tokens"
import { Button } from "@heroui/react"
import { useCallback, useEffect, useState } from "react"
import type { Database } from "supabase/database.generated"
import { createBrowserClient } from "../../lib/supabase/client"
import { CreatePostModal, FeedPost } from "../components/bivaque/feed-post"

type FeedPostRow = Database["public"]["Functions"]["feed_posts"]["Returns"][number]

const MANAUS_LOCALITY_ID = "00000000-0000-4000-8000-000000000001"

export default function CommunityPage() {
  const [posts, setPosts] = useState<FeedPostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const supabase = createBrowserClient()

  const loadFeed = useCallback(async () => {
    setLoading(true)
    setError("")

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
  }, [supabase])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-12 z-30 border-b border-[color-mix(in_oklch,var(--foreground)_8%,transparent)] bg-[var(--surface)] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Minha comunidade</h1>
          <Button
            size="sm"
            onPress={() => setShowCreateModal(true)}
            style={{
              backgroundColor: brandTokens.color.accent,
              color: brandTokens.color.accentForeground,
            }}
          >
            Publicar
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        {error && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <p className="py-12 text-center text-sm text-muted">Carregando publicacoes...</p>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted">
              Nenhuma publicacao ainda. Seja o primeiro a compartilhar!
            </p>
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className="space-y-3">
            {posts.map((post) => (
              <FeedPost key={post.id} post={post} />
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
