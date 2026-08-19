import { Button } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { FeedPost } from "../../../components/bivaque/feed-post"
import { requestCommunityMembershipAction, transferCommunityOwnershipAction } from "../actions"

type CommunityRow = Database["public"]["Tables"]["communities"]["Row"]
type MembershipRow = Database["public"]["Tables"]["community_memberships"]["Row"]
type FeedCommunityRow = Database["public"]["Functions"]["feed_community"]["Returns"][number]
type FeedPostRow = Database["public"]["Functions"]["feed_posts"]["Returns"][number]
type MemberListRow = {
  user_id: string
  role: MembershipRow["role"]
  status: MembershipRow["status"]
  joined_at: string
}

export default async function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: communityId } = await params

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

  const { data: communityData, error: communityError } = await supabase
    .from("communities")
    .select("*")
    .eq("id", communityId)
    .eq("is_deleted", false)
    .maybeSingle()

  if (communityError) {
    throw new Error(`Falha ao ler a comunidade: ${communityError.message}`)
  }
  const community = communityData as CommunityRow | null
  if (!community) {
    notFound()
  }

  const { data: membershipData, error: membershipError } = await supabase
    .from("community_memberships")
    .select("*")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError) {
    throw new Error(`Falha ao ler a participação: ${membershipError.message}`)
  }
  const membership = membershipData as MembershipRow | null
  const isApproved = membership?.status === "approved"
  const isPending = membership?.status === "pending"
  const canModerate = isApproved && membership.role !== "member"

  const [approvedResult, feedResult] = await Promise.all([
    supabase
      .from("community_memberships")
      .select("user_id, role, status, joined_at")
      .eq("community_id", community.id)
      .eq("status", "approved")
      .limit(30),
    supabase.rpc("feed_community", { p_community_id: community.id }),
  ])

  if (approvedResult.error) {
    throw new Error(`Falha ao ler os membros: ${approvedResult.error.message}`)
  }
  if (feedResult.error) {
    throw new Error(`Falha ao ler o feed da comunidade: ${feedResult.error.message}`)
  }

  const approvedMembers = (approvedResult.data as MemberListRow[] | null) ?? []
  const feed = (feedResult.data as FeedCommunityRow[] | null) ?? []

  const memberIds = approvedMembers.map((member) => member.user_id)
  const memberNames = new Map<string, string>()
  if (memberIds.length > 0) {
    const { data: namesData, error: namesError } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", memberIds)

    if (namesError) {
      throw new Error(`Falha ao ler os nomes dos membros: ${namesError.message}`)
    }
    for (const profile of (namesData as { user_id: string; display_name: string }[] | null) ?? []) {
      memberNames.set(profile.user_id, profile.display_name)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-12 z-30 border-b border-border bg-[var(--surface)] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">{community.name}</h1>
            {community.description && (
              <p className="mt-1 text-sm text-muted">{community.description}</p>
            )}
          </div>

          {isApproved ? (
            <span className="shrink-0 rounded-sm bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
              {membership.role === "owner"
                ? "Dono"
                : membership.role === "moderator"
                  ? "Moderador"
                  : "Membro"}
            </span>
          ) : isPending ? (
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
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-4 pb-8">
        {canModerate && (
          <p className="text-sm text-muted">
            Você modera esta comunidade. Pedidos de entrada estão em{" "}
            <a href={`/communities/${community.id}/admin/pending`} className="underline">
              /admin/pending
            </a>
            .
          </p>
        )}

        {isApproved && (
          <p className="text-sm text-muted">
            Convite de membro carrega o escopo desta vila.{" "}
            <a href={`/communities/${community.id}/invite`} className="underline">
              Convidar membros
            </a>
            .
          </p>
        )}

        {isApproved && approvedMembers.length > 0 && (
          <section aria-labelledby="members-heading">
            <h2 id="members-heading" className="mb-2 text-sm font-semibold tracking-tight">
              Membros
            </h2>
            <ul className="space-y-1">
              {approvedMembers.map((member) => (
                <li key={member.user_id} className="text-sm text-muted">
                  {memberNames.get(member.user_id) ?? "Membro"}
                  {member.role !== "member" && (
                    <span className="ml-1 text-xs uppercase tracking-wide text-muted">
                      ({member.role})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="community-feed-heading">
          <h2 id="community-feed-heading" className="mb-2 text-sm font-semibold tracking-tight">
            Publicações
          </h2>
          {isApproved ? (
            feed.length > 0 ? (
              <div className="space-y-2">
                {feed.map((post) => (
                  <FeedPost
                    key={post.id}
                    post={post as unknown as FeedPostRow}
                    index={feed.indexOf(post)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Nenhuma publicação ainda.</p>
            )
          ) : (
            <p className="text-sm text-muted">Entre na comunidade para ver as publicações.</p>
          )}
        </section>

        {membership?.role === "owner" && approvedMembers.length > 1 && (
          <section aria-labelledby="transfer-heading">
            <h2 id="transfer-heading" className="mb-2 text-sm font-semibold tracking-tight">
              Transferir propriedade
            </h2>
            <form action={transferCommunityOwnershipAction} className="flex items-center gap-2">
              <input type="hidden" name="communityId" value={community.id} />
              <select
                name="newOwnerId"
                required
                aria-label="Novo dono da comunidade"
                className="rounded-md border border-border bg-[var(--surface)] px-2 py-1.5 text-sm"
              >
                <option value="" disabled>
                  Escolher novo dono...
                </option>
                {approvedMembers
                  .filter((member) => member.user_id !== user.id)
                  .map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {memberNames.get(member.user_id) ?? "Membro"}
                    </option>
                  ))}
              </select>
              <Button type="submit" size="sm" variant="tertiary">
                Transferir
              </Button>
            </form>
          </section>
        )}
      </div>
    </div>
  )
}
