// Onda E Task 7 — other-member profile page (Server Component).
//
// /profile/[userId] is the page the privacy copy presupposes: a place to
// see another verified member's history. Three boundaries:
//   1. The viewer must be logged in (shell layout already gates this, but
//      we double-check).
//   2. The target must share a locality with the viewer (otherwise RLS
//      hides everything anyway; we notFound() for cleanliness — and for
//      the README "E2E ensinou": next 16 notFound responds 200, so the
//      test asserts the UI, not the status).
//   3. The two tabs (Publicações, Eventos) call RPCs that scope by the
//      VIEWER's locality — the leak-by-attention that the existing
//      /profile had is gone (post in vila A is invisible to a non-A viewer
//      even though it's in the same locality).

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { callProfileRpc } from "../../../../lib/profile-rpcs"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"

interface PageProps {
  params: Promise<{ userId: string }>
}

// Helper: render one of the two profile sections (posts or events) given
// already-resolved rows. Kept here so the test file can read the JSX shape
// without re-importing the RPC.
function PostsSection({ rows }: { rows: PostRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">Nenhuma publicação visível.</p>
  }
  return (
    <ul className="space-y-3">
      {rows.map((p) => (
        <li key={p.id} className="rounded-xl border border-border bg-[var(--surface)] p-4">
          <p className="text-sm break-words whitespace-pre-wrap">{p.content ?? ""}</p>
          <p className="mt-1 text-xs text-muted">
            {new Date(p.created_at).toLocaleDateString("pt-BR")}
          </p>
        </li>
      ))}
    </ul>
  )
}

function EventsSection({ rows }: { rows: EventRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">Nenhum evento visível.</p>
  }
  return (
    <ul className="space-y-2">
      {rows.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between rounded-xl border border-border bg-[var(--surface)] px-4 py-3"
        >
          <span className="text-sm font-medium">{e.title}</span>
          <span className="text-xs text-muted">
            {new Date(e.starts_at).toLocaleDateString("pt-BR")}
          </span>
        </li>
      ))}
    </ul>
  )
}

type PostRow = {
  id: string
  content: string | null
  created_at: string
}

type EventRow = {
  id: string
  title: string
  starts_at: string
}

type ProfileRow = {
  display_name: string | null
}

export default async function OtherMemberProfilePage({ params }: PageProps) {
  const { userId } = await params

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })

  const {
    data: { user: viewer },
  } = await authClient.auth.getUser()
  if (!viewer) {
    // The (shell) layout redirects anonymous users; this is defense in depth.
    notFound()
  }

  const serviceClient = createServiceClient()

  // Visibility: viewer and target must share a locality. This RPC is the
  // single source of truth (Step 3 of the plan: read every error; no embed
  // across tables without an FK).
  const { data: isVisible, error: visibilityError } = await callProfileRpc(
    serviceClient,
    "profile_is_visible_to_viewer",
    { p_target_user_id: userId, p_viewer_user_id: viewer.id },
  )
  if (visibilityError) {
    throw new Error(`Falha ao verificar visibilidade: ${visibilityError.message}`)
  }
  if (!isVisible) {
    // Target is in a locality the viewer doesn't share — the rest of the
    // page would render empty, so the honest answer is notFound(). The
    // privacy boundary is that the existence of the target's profile is
    // itself invisible to a viewer who doesn't share a locality.
    notFound()
  }

  // Profile metadata (display name). We read errors and never embed.
  const { data: profileRow, error: profileError } = await serviceClient
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle()
  if (profileError) {
    throw new Error(`Falha ao ler o perfil: ${profileError.message}`)
  }

  // Posts and events: scoped by the RPC (Step 3: server-side visibility).
  const [postsResult, eventsResult] = await Promise.all([
    callProfileRpc(serviceClient, "profile_posts_for", {
      p_target_user_id: userId,
      p_viewer_user_id: viewer.id,
    }),
    callProfileRpc(serviceClient, "profile_events_for", {
      p_target_user_id: userId,
      p_viewer_user_id: viewer.id,
    }),
  ])
  if (postsResult.error) {
    throw new Error(`Falha ao ler publicações: ${postsResult.error.message}`)
  }
  if (eventsResult.error) {
    throw new Error(`Falha ao ler eventos: ${eventsResult.error.message}`)
  }

  const profile = (profileRow as ProfileRow | null) ?? { display_name: null }
  const posts = (postsResult.data as PostRow[] | null) ?? []
  const events = (eventsResult.data as EventRow[] | null) ?? []

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-6 pb-8">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">{profile.display_name ?? "Membro"}</h1>
        <p className="mt-1 text-sm text-muted">
          Apenas conteúdo que você e esta pessoa podem ver pela mesma cidade.
        </p>
      </header>

      <section aria-labelledby="posts-heading" className="space-y-2">
        <h2 id="posts-heading" className="text-base font-semibold tracking-tight">
          Publicações
        </h2>
        <PostsSection rows={posts} />
      </section>

      <section aria-labelledby="events-heading" className="space-y-2">
        <h2 id="events-heading" className="text-base font-semibold tracking-tight">
          Eventos
        </h2>
        <EventsSection rows={events} />
      </section>
    </div>
  )
}
