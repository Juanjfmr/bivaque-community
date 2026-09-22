import { Button } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../../../../lib/supabase/server"
import { addCommunityModeratorAction, removeCommunityModeratorAction } from "../../../actions"

type MemberRow = {
  user_id: string
  role: string
  status: string
}

// Onda E Task 5, Step 3: delegação. A vila precisa de moderadores — não dá
// para o dono aprovar 600 pedidos sozinho (§5.1) — mas só o dono PROMEVE
// (migration 023 corrigiu a RPC para exigir owner_user_id; o achado está
// documentado em AUDIT-2026-08-19). Despromover moderador é também do
// dono; a RPC já fazia isso corretamente.

export default async function CommunityModeratorsPage({
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
      setAll() {},
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) {
    return null
  }

  const serviceClient = createServiceClient()

  const { data: moderatorsData, error: moderatorsError } = await serviceClient
    .from("community_memberships")
    .select("user_id, role, status")
    .eq("community_id", communityId)
    .in("role", ["owner", "moderator"])
    .eq("status", "approved")
    .order("role", { ascending: true })

  if (moderatorsError) {
    throw new Error(`Falha ao ler moderadores: ${moderatorsError.message}`)
  }

  const { data: eligibleData, error: eligibleError } = await serviceClient
    .from("community_memberships")
    .select("user_id, role, status")
    .eq("community_id", communityId)
    .eq("role", "member")
    .eq("status", "approved")
    .order("user_id", { ascending: true })
    .limit(50)

  if (eligibleError) {
    throw new Error(`Falha ao ler membros elegíveis: ${eligibleError.message}`)
  }

  const moderators = (moderatorsData as MemberRow[] | null) ?? []
  const eligible = (eligibleData as MemberRow[] | null) ?? []

  const allIds = [...moderators.map((m) => m.user_id), ...eligible.map((m) => m.user_id)]
  const displayNames = new Map<string, string>()
  if (allIds.length > 0) {
    const { data: namesData, error: namesError } = await serviceClient
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", allIds)
    if (namesError) {
      throw new Error(`Falha ao ler nomes: ${namesError.message}`)
    }
    for (const profile of (namesData as { user_id: string; display_name: string }[] | null) ?? []) {
      displayNames.set(profile.user_id, profile.display_name)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-6 pb-8">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Moderadores</h1>
        <p className="mt-1 text-sm text-muted">
          Só o dono promove e despromove moderadores. Moderadores aprovam pedidos e removem membros.
        </p>
      </header>

      <section aria-labelledby="moderators-heading" className="space-y-2">
        <h2 id="moderators-heading" className="text-base font-semibold tracking-tight">
          Moderadores atuais
        </h2>
        {moderators.length === 0 ? (
          <p className="text-sm text-muted">Nenhum moderador além do dono.</p>
        ) : (
          <ul className="space-y-2">
            {moderators.map((member) => (
              <li
                key={member.user_id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <div>{displayNames.get(member.user_id) ?? "Membro"}</div>
                  <div className="text-xs text-muted">
                    {member.role === "owner" ? "Dono" : "Moderador"}
                  </div>
                </div>
                {member.role === "moderator" ? (
                  <form action={removeCommunityModeratorAction}>
                    <input type="hidden" name="communityId" value={communityId} />
                    <input type="hidden" name="userId" value={member.user_id} />
                    <Button type="submit" size="sm" variant="tertiary">
                      Despromover
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="promote-heading" className="space-y-2">
        <h2 id="promote-heading" className="text-base font-semibold tracking-tight">
          Promover membro aprovado
        </h2>
        {eligible.length === 0 ? (
          <p className="text-sm text-muted">Não há membros aprovados disponíveis para promover.</p>
        ) : (
          <ul className="space-y-2">
            {eligible.map((member) => (
              <li
                key={member.user_id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm"
              >
                <span>{displayNames.get(member.user_id) ?? "Membro"}</span>
                <form action={addCommunityModeratorAction}>
                  <input type="hidden" name="communityId" value={communityId} />
                  <input type="hidden" name="userId" value={member.user_id} />
                  <Button type="submit" size="sm" variant="primary">
                    Promover a moderador
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
