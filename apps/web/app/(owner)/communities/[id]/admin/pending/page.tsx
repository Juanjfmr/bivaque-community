import { Button } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../../../../lib/supabase/server"
import { approveCommunityMemberAction, removeCommunityMemberAction } from "../../../actions"

type MemberRow = {
  user_id: string
  role: string
  status: string
  joined_at: string
}

export default async function CommunityPendingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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
        // Server component, no writes.
      },
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) {
    // Layout already redirected, but guard anyway.
    return null
  }

  const serviceClient = createServiceClient()
  const { data: pendingData, error: pendingError } = await serviceClient
    .from("community_memberships")
    .select("user_id, role, status, joined_at")
    .eq("community_id", communityId)
    .eq("status", "pending")
    .order("joined_at", { ascending: true })
    .limit(50)

  if (pendingError) {
    throw new Error(`Falha ao ler a fila de aprovação: ${pendingError.message}`)
  }

  const pending = (pendingData as MemberRow[] | null) ?? []
  const memberIds = pending.map((member) => member.user_id)
  const memberNames = new Map<string, string>()
  if (memberIds.length > 0) {
    const { data: namesData, error: namesError } = await serviceClient
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", memberIds)
    if (namesError) {
      throw new Error(`Falha ao ler os nomes: ${namesError.message}`)
    }
    for (const profile of (namesData as { user_id: string; display_name: string }[] | null) ?? []) {
      memberNames.set(profile.user_id, profile.display_name)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-6 pb-8">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Pedidos de entrada</h1>
        <p className="mt-1 text-sm text-muted">
          Aprovar ou recusar candidatos antes que entrem no feed da comunidade.
        </p>
      </header>

      {pending.length === 0 ? (
        <p className="text-sm text-muted">Nenhum pedido pendente.</p>
      ) : (
        <ul className="space-y-2">
          {pending.map((member) => (
            <li
              key={member.user_id}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
            >
              <span>{memberNames.get(member.user_id) ?? "Membro"}</span>
              <div className="flex gap-2">
                <form action={approveCommunityMemberAction}>
                  <input type="hidden" name="communityId" value={communityId} />
                  <input type="hidden" name="userId" value={member.user_id} />
                  <Button type="submit" size="sm" variant="primary">
                    Aprovar
                  </Button>
                </form>
                <form action={removeCommunityMemberAction}>
                  <input type="hidden" name="communityId" value={communityId} />
                  <input type="hidden" name="userId" value={member.user_id} />
                  <Button type="submit" size="sm" variant="tertiary">
                    Recusar
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
