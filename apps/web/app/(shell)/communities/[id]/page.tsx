import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { isUuid } from "./community-detail-data"
import { loadCommunityDetail } from "./community-detail-loaders"
import { CommunityDetailScreen } from "./community-detail-screen"

export default async function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: communityId } = await params
  if (!isUuid(communityId)) {
    notFound()
  }

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/login?return=/communities/${communityId}`)
  }

  const view = await loadCommunityDetail(supabase, communityId, user.id)
  if (view.status === "not-found") {
    notFound()
  }

  return <CommunityDetailScreen view={view} />
}
