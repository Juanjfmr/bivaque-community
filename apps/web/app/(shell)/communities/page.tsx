import { Button } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { requestCommunityMembershipAction } from "./actions"

type CommunityRow = Database["public"]["Tables"]["communities"]["Row"]
type MembershipRow = Database["public"]["Tables"]["community_memberships"]["Row"]

export default async function CommunitiesPage() {
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
    redirect("/login?return=/communities")
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("locality_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(`Falha ao ler o perfil: ${profileError.message}`)
  }

  const profile = profileData as { locality_id: string } | null
  const localityId = profile?.locality_id

  let communities: CommunityRow[] = []
  if (localityId) {
    const { data, error: communitiesError } = await supabase
      .from("communities")
      .select("*")
      .eq("locality_id", localityId)
      .order("name")

    if (communitiesError) {
      throw new Error(`Falha ao ler as comunidades: ${communitiesError.message}`)
    }
    communities = (data as CommunityRow[] | null) ?? []
  }

  const { data: membershipsData, error: membershipsError } = await supabase
    .from("community_memberships")
    .select("community_id, user_id, role, status, joined_at")
    .eq("user_id", user.id)

  if (membershipsError) {
    throw new Error(`Falha ao ler as participações: ${membershipsError.message}`)
  }

  const membershipByCommunity = new Map(
    ((membershipsData as MembershipRow[] | null) ?? []).map((membership) => [
      membership.community_id,
      membership,
    ]),
  )

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 id="communities-heading" className="text-2xl font-semibold tracking-tight">
          Comunidades
        </h1>
        <p className="text-sm text-muted">
          Vilas e outros círculos por circunstância. Peça entrada para ver o conteúdo.
        </p>
      </header>

      {communities.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma comunidade disponível na sua localidade.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {communities.map((community) => {
            const membership = membershipByCommunity.get(community.id)
            return (
              <li
                key={community.id}
                className="flex flex-col gap-3 rounded-lg border border-border p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">
                      <a href={`/communities/${community.id}`} className="hover:underline">
                        {community.name}
                      </a>
                    </h2>
                    {community.description && (
                      <p className="mt-1 text-sm text-muted">{community.description}</p>
                    )}
                  </div>

                  {membership?.status === "approved" ? (
                    <a
                      href={`/communities/${community.id}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-subtle"
                    >
                      Abrir
                    </a>
                  ) : membership?.status === "pending" ? (
                    <Button size="sm" variant="tertiary" isDisabled>
                      Aguardando aprovação
                    </Button>
                  ) : (
                    <form action={requestCommunityMembershipAction}>
                      <input type="hidden" name="communityId" value={community.id} />
                      <Button type="submit" size="sm" variant="primary">
                        Pedir entrada
                      </Button>
                    </form>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
