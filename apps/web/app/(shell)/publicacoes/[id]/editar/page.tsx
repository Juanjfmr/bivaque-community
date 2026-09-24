"use client"

import { useRouter } from "next/navigation"
import { use, useCallback, useEffect, useMemo, useState } from "react"
import type { Database } from "supabase/database.generated"
import { createBrowserClient } from "../../../../../lib/supabase/client"
import { ErrorState } from "../../../../components/bivaque/error-state"
import { EditPostPage } from "../../../../components/bivaque/feed-post-edit"
import { Skeleton } from "../../../../components/bivaque/skeleton"

type EditPostRow = Pick<
  Database["public"]["Tables"]["posts"]["Row"],
  | "id"
  | "locality_id"
  | "content"
  | "photo_path"
  | "community_id"
  | "group_id"
  | "post_type"
  | "user_id"
>

type LoadState =
  | { status: "loading" }
  | { status: "ready"; post: EditPostRow; authorName: string | null }
  | { status: "not-found" }
  | { status: "error" }

export default function EditPublicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = useMemo(() => createBrowserClient(), [])
  const [state, setState] = useState<LoadState>({ status: "loading" })

  const load = useCallback(async () => {
    setState({ status: "loading" })
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      setState({ status: "not-found" })
      return
    }

    const { data, error } = await supabase
      .from("posts")
      .select("id, locality_id, content, photo_path, community_id, group_id, post_type, user_id")
      .eq("id", id)
      .eq("is_deleted", false)
      .maybeSingle()

    if (error) {
      setState({ status: "error" })
      return
    }
    if (!data || data.user_id !== user.id) {
      setState({ status: "not-found" })
      return
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", data.user_id)
      .maybeSingle()
    setState({ status: "ready", post: data, authorName: profile?.display_name ?? null })
  }, [id, supabase])

  useEffect(() => {
    void load()
  }, [load])

  if (state.status === "loading") {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-8" aria-busy="true">
        <h1 className="sr-only">Editar publicação</h1>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-6 h-40 w-full" />
      </main>
    )
  }

  if (state.status === "error") {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Editar publicação</h1>
        <ErrorState
          message="Não foi possível carregar esta publicação. Tente novamente."
          onRetry={() => void load()}
        />
      </main>
    )
  }

  if (state.status === "not-found") {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Editar publicação</h1>
        <ErrorState message="Esta publicação não está disponível para edição." />
      </main>
    )
  }

  return (
    <EditPostPage
      post={state.post}
      authorName={state.authorName}
      onSaved={() => router.prefetch("/community")}
      onClose={() => router.push("/community")}
    />
  )
}
