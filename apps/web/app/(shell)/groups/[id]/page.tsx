import { Button } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"
import { FeedPost } from "../../../components/bivaque/feed-post"

type GroupRow = Database["public"]["Tables"]["groups"]["Row"]
type MembershipRow = Database["public"]["Tables"]["group_memberships"]["Row"]
type FeedGroupRow = Database["public"]["Functions"]["feed_group"]["Returns"][number]
type MemberRow = MembershipRow & {
  profiles: { display_name: string } | null
}

// ── Server actions (writes) ──────────────────────────────────────────────────
// These mutate through the service role, following the codebase convention
// for server actions (see events/event-invites-actions.ts): they authenticate
// via cookies, then write. The page's data reads below deliberately use the
// authenticated client so RLS decides what is visible.

async function joinGroupAction(formData: FormData) {
  "use server"
  const groupId = formData.get("groupId")
  const desiredStatus = formData.get("desiredStatus")
  if (typeof groupId !== "string" || groupId.length === 0) throw new Error("groupId required")
  if (desiredStatus !== "approved" && desiredStatus !== "pending") {
    throw new Error("invalid desiredStatus")
  }

  const supabase = createServiceClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  await supabase.from("group_memberships").upsert(
    {
      group_id: groupId,
      user_id: user.id,
      role: "member",
      status: desiredStatus,
    },
    { onConflict: "group_id,user_id" },
  )

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/groups")
}

async function leaveGroupAction(formData: FormData) {
  "use server"
  const groupId = formData.get("groupId")
  if (typeof groupId !== "string" || groupId.length === 0) throw new Error("groupId required")

  const supabase = createServiceClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  await supabase.from("group_memberships").delete().eq("group_id", groupId).eq("user_id", user.id)

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/groups")
}

async function transferOwnershipAction(formData: FormData) {
  "use server"
  const groupId = formData.get("groupId")
  const newOwnerId = formData.get("newOwnerId")
  if (typeof groupId !== "string" || groupId.length === 0) throw new Error("groupId required")
  if (typeof newOwnerId !== "string" || newOwnerId.length === 0) {
    throw new Error("newOwnerId required")
  }

  const supabase = createServiceClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  const { error } = await supabase.rpc("transfer_group_ownership", {
    p_group_id: groupId,
    p_new_owner_user_id: newOwnerId,
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/groups")
}

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params

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
    redirect(`/login?return=/groups/${groupId}`)
  }

  // All reads go through the authenticated client so RLS — not this page —
  // decides what is visible: groups_select_locality_member gates the group
  // row, group_memberships_select gates the member list by visibility, and
  // feed_group is security definer and self-gates. A null row means the
  // viewer may not even know the group exists: 404, never a permission
  // screen that would confirm existence. A failed read is infrastructure
  // failure, not a denial, so errors are thrown instead of being swallowed.
  const { data: groupData, error: groupError } = await authClient
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .eq("is_deleted", false)
    .maybeSingle()

  if (groupError) throw new Error(`failed to read group: ${groupError.message}`)
  const group = groupData as GroupRow | null
  if (!group) {
    notFound()
  }

  const { data: membershipData, error: membershipError } = await authClient
    .from("group_memberships")
    .select("*")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError) throw new Error(`failed to read membership: ${membershipError.message}`)
  const membership = membershipData as MembershipRow | null

  const { data: membersData, error: membersError } = await authClient
    .from("group_memberships")
    .select("user_id, role, status, joined_at, profiles:profiles!inner(display_name)")
    .eq("group_id", group.id)
    .eq("status", "approved")
    .limit(10)

  if (membersError) throw new Error(`failed to read members: ${membersError.message}`)
  const members = (membersData as unknown as MemberRow[] | null) ?? []

  const { data: feedData, error: feedError } = await authClient.rpc("feed_group", {
    p_group_id: group.id,
  })

  if (feedError) throw new Error(`failed to read group feed: ${feedError.message}`)
  const feed = (feedData as FeedGroupRow[] | null) ?? []

  const isApproved = membership?.status === "approved"
  const isPending = membership?.status === "pending"
  const isOwner = group.owner_user_id === user.id

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-12 z-30 border-b border-border bg-[var(--surface)] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="truncate text-lg font-semibold tracking-tight">{group.name}</h1>
              <span className="shrink-0 text-xs uppercase tracking-wide text-muted">
                {group.visibility === "public" ? "público" : "privado"}
              </span>
            </div>
            {group.description && <p className="mt-1 text-sm text-muted">{group.description}</p>}
          </div>
          {isApproved ? (
            <form action={leaveGroupAction}>
              <input type="hidden" name="groupId" value={group.id} />
              <Button type="submit" size="sm" variant="tertiary">
                Sair
              </Button>
            </form>
          ) : isPending ? (
            <Button size="sm" variant="tertiary" isDisabled>
              Aguardando aprovação
            </Button>
          ) : (
            <form action={joinGroupAction}>
              <input type="hidden" name="groupId" value={group.id} />
              <input
                type="hidden"
                name="desiredStatus"
                value={group.visibility === "public" ? "approved" : "pending"}
              />
              <Button type="submit" size="sm" variant="primary">
                {group.visibility === "public" ? "Entrar" : "Pedir entrada"}
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-4 pb-8">
        {members.length > 0 && (
          <section aria-labelledby="members-heading">
            <h2 id="members-heading" className="mb-2 text-sm font-semibold tracking-tight">
              Membros
            </h2>
            <ul className="space-y-1">
              {members.map((m) => (
                <li key={m.user_id} className="text-sm text-muted">
                  {m.profiles?.display_name ?? "Membro"}
                  {m.role !== "member" && (
                    <span className="ml-1 text-xs uppercase tracking-wide text-muted">
                      ({m.role})
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {isOwner && (
              <form action={transferOwnershipAction} className="mt-3 flex items-center gap-2">
                <input type="hidden" name="groupId" value={group.id} />
                <select
                  name="newOwnerId"
                  required
                  aria-label="Transferir ownership para"
                  className="rounded-md border border-border bg-[var(--surface)] px-2 py-1.5 text-sm"
                >
                  <option value="" disabled>
                    Transferir ownership...
                  </option>
                  {members
                    .filter((m) => m.user_id !== user.id)
                    .map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profiles?.display_name ?? "Membro"}
                      </option>
                    ))}
                </select>
                <Button type="submit" size="sm" variant="tertiary">
                  Transferir
                </Button>
              </form>
            )}
          </section>
        )}

        <section aria-labelledby="group-feed-heading">
          <h2 id="group-feed-heading" className="mb-2 text-sm font-semibold tracking-tight">
            Publicações
          </h2>
          {feed.length > 0 ? (
            <div className="space-y-2">
              {feed.map((post, index) => (
                <FeedPost key={post.id} post={post} index={index} isBookmarked={false} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nenhuma publicação ainda.</p>
          )}
        </section>
      </div>
    </div>
  )
}
