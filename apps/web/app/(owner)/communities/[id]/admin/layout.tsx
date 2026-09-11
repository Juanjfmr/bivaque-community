import { createServerClient } from "@supabase/ssr"
import type { Route } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import type { ReactNode } from "react"
import { createServerClient as createServiceClient } from "../../../../../lib/supabase/server"

export default async function CommunityAdminLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ id: string }> }>) {
  const { id: communityId } = await params

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
      setAll() {
        // Layout is read-only.
      },
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) {
    redirect(`/login?return=/communities/${communityId}/admin` as Route)
  }

  const serviceClient = createServiceClient()
  const { data: community, error: communityError } = await serviceClient
    .from("communities")
    .select("id, name")
    .eq("id", communityId)
    .eq("is_deleted", false)
    .maybeSingle()

  if (communityError) {
    throw new Error(`Falha ao ler a comunidade: ${communityError.message}`)
  }
  if (!community) {
    notFound()
  }

  // D2 Task 9 (recovered by audit 2026-08-19): the gate is the moderator
  // check, NOT a generic operator check. Operator and community-owner are
  // independent authorizations — sharing one gated component is exactly
  // the failure mode the plan calls out.
  const { data: isModerator } = await serviceClient.rpc("is_current_user_community_moderator", {
    p_community_id: communityId,
    p_user_id: user.id,
  })

  if (!isModerator) {
    redirect(`/communities/${communityId}` as Route)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <nav
        aria-label={`Console do dono da comunidade ${community.name}`}
        className="border-b border-border bg-surface px-6 py-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
          <span className="text-muted">Console — {community.name}</span>
          <ul className="flex flex-wrap gap-4">
            <li>
              <Link
                href={`/communities/${communityId}/admin/pending` as Route}
                className="inline-flex min-h-11 items-center rounded-md px-3 text-muted hover:text-foreground"
              >
                Pedidos de entrada
              </Link>
            </li>
            <li>
              <Link
                href={`/communities/${communityId}/admin/media` as Route}
                className="inline-flex min-h-11 items-center rounded-md px-3 text-muted hover:text-foreground"
              >
                Imagens
              </Link>
            </li>
            <li>
              <Link
                href={`/communities/${communityId}` as Route}
                className="inline-flex min-h-11 items-center rounded-md px-3 text-muted hover:text-foreground"
              >
                Voltar à comunidade
              </Link>
            </li>
          </ul>
        </div>
      </nav>
      {children}
    </div>
  )
}
