import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { signCommunityImageUrls } from "../../../../../../lib/communities/community-image-urls"
import { createServerClient as createServiceClient } from "../../../../../../lib/supabase/server"
import { CommunityMediaForm } from "./media-form"

export default async function CommunityMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: communityId } = await params

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) {
    redirect(`/login?return=/communities/${communityId}/admin/media`)
  }

  const service = createServiceClient()
  const { data: community, error } = await service
    .from("communities")
    .select("id, name, banner_path, thumbnail_path, owner_user_id, is_deleted")
    .eq("id", communityId)
    .eq("is_deleted", false)
    .maybeSingle()

  if (error) {
    throw new Error(`Falha ao ler a comunidade: ${error.message}`)
  }
  if (!community) {
    notFound()
  }

  const imageUrls = (
    await signCommunityImageUrls(authClient, [
      {
        communityId,
        banner: community.banner_path !== null,
        thumbnail: community.thumbnail_path !== null,
      },
    ])
  ).get(communityId) ?? { bannerUrl: null, thumbnailUrl: null }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-6 pb-8">
      <h1 className="text-lg font-semibold tracking-tight">Imagens da comunidade</h1>
      <p className="text-sm text-muted">
        A faixa aparece no topo da apresentação; a miniatura aparece nos cartões e na barra lateral.
        Só quem responde pela comunidade pode enviar, trocar e remover.
      </p>
      <CommunityMediaForm
        communityId={communityId}
        communityName={community.name}
        canManage={community.owner_user_id === user.id}
        bannerUrl={imageUrls.bannerUrl}
        thumbnailUrl={imageUrls.thumbnailUrl}
      />
    </div>
  )
}
