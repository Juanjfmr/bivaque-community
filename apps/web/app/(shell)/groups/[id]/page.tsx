import { Button } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { FeedPost } from "../../../components/bivaque/feed-post"

type GroupRow = Database["public"]["Tables"]["groups"]["Row"]
type MembershipRow = Database["public"]["Tables"]["group_memberships"]["Row"]
type FeedGroupRow = Database["public"]["Functions"]["feed_group"]["Returns"][number]
type MemberListRow = {
  user_id: string
  role: MembershipRow["role"]
  status: MembershipRow["status"]
  joined_at: string
}

// ── Server actions (writes) ──────────────────────────────────────────────────
// Authenticate from cookies, write through the authenticated client so RLS
// decides. The pattern is the same as communities/actions.ts. completeEvent
// stays on service_role because the RPC is service_role-only; the others
// were broken before (createServiceClient() with persistSession: false made
// getUser() return null — Step 1 of the plan recorded the measurement).

async function getAuthClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
}

async function joinGroupAction(formData: FormData) {
  "use server"
  const groupId = formData.get("groupId")
  if (typeof groupId !== "string" || groupId.length === 0) throw new Error("groupId required")

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  // desiredStatus used to come from the form. The plan removes that: the
  // server derives status from groups.visibility through join_group
  // (public → approved, private → pending). The form can still send
  // desiredStatus for now, and it is silently ignored — Step 5 of the
  // plan removes the hidden field from the markup.
  const { error } = await supabase.rpc("join_group", { p_group_id: groupId })
  if (error) throw new Error(error.message)

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/groups")
}

async function leaveGroupAction(formData: FormData) {
  "use server"
  const groupId = formData.get("groupId")
  if (typeof groupId !== "string" || groupId.length === 0) throw new Error("groupId required")

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  // group_memberships has no delete policy for authenticated today (the
  // snapshot test records it). The fix has to add the policy — that is
  // the next commit, this one only fixes the authentication. The delete
  // will still be denied by RLS until the policy lands; the action stops
  // being broken in the way it was (silent escalation via service_role)
  // and starts being broken in the visible way (RLS denial the page
  // can show).
  const { error } = await supabase
    .from("group_memberships")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)

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

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  // transfer_group_ownership is granted to authenticated and the RPC
  // itself checks that the caller is the current owner. The action now
  // matches the convention of communities/actions.ts.
  const { error } = await supabase.rpc("transfer_group_ownership", {
    p_group_id: groupId,
    p_new_owner_user_id: newOwnerId,
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/groups")
}

// F8 Step 1: complete the group administrator cycle.

async function cancelPendingMembershipAction(formData: FormData) {
  "use server"
  const groupId = formData.get("groupId")
  if (typeof groupId !== "string" || groupId.length === 0) throw new Error("groupId required")

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  // Cancel own pending request. RLS group_memberships_delete_self allows
  // deleting own membership regardless of status.
  const { error } = await supabase
    .from("group_memberships")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/groups")
}

async function rejectMembershipAction(formData: FormData) {
  "use server"
  const groupId = formData.get("groupId")
  const targetUserId = formData.get("targetUserId")
  if (typeof groupId !== "string" || groupId.length === 0) throw new Error("groupId required")
  if (typeof targetUserId !== "string" || targetUserId.length === 0) {
    throw new Error("targetUserId required")
  }

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  // Reject another member's pending request. RLS group_memberships_delete_moderator
  // requires the caller to be a moderator of the group.
  const { error } = await supabase
    .from("group_memberships")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", targetUserId)
  if (error) throw new Error(error.message)

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/groups")
}

async function removeMemberAction(formData: FormData) {
  "use server"
  const groupId = formData.get("groupId")
  const targetUserId = formData.get("targetUserId")
  if (typeof groupId !== "string" || groupId.length === 0) throw new Error("groupId required")
  if (typeof targetUserId !== "string" || targetUserId.length === 0) {
    throw new Error("targetUserId required")
  }

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  // Remove an approved member. RLS group_memberships_delete_moderator applies.
  const { error } = await supabase
    .from("group_memberships")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", targetUserId)
  if (error) throw new Error(error.message)

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/groups")
}

async function deleteGroupAction(formData: FormData) {
  "use server"
  const groupId = formData.get("groupId")
  if (typeof groupId !== "string" || groupId.length === 0) throw new Error("groupId required")

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  // Soft-delete: set is_deleted=true. The groups_update_owner policy allows
  // this because the owner is also a moderator (is_group_moderator returns true).
  const { error } = await supabase.from("groups").update({ is_deleted: true }).eq("id", groupId)
  if (error) throw new Error(error.message)

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/groups")
}

export {
  cancelPendingMembershipAction,
  deleteGroupAction,
  joinGroupAction,
  leaveGroupAction,
  rejectMembershipAction,
  removeMemberAction,
  transferOwnershipAction,
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
    .select("user_id, role, status, joined_at")
    .eq("group_id", group.id)
    .eq("status", "approved")
    .limit(10)

  if (membersError) throw new Error(`failed to read members: ${membersError.message}`)
  const members = (membersData as unknown as MemberListRow[] | null) ?? []

  // PostgREST cannot embed profiles here: there is no FK between
  // group_memberships and profiles (profiles has a composite key), so the
  // names are read in a second, equally RLS-gated query and joined in memory.
  // A profile the viewer may not see simply has no name — it renders as the
  // "Membro" fallback, never as a leak.
  const memberIds = members.map((m) => m.user_id)
  let memberNames = new Map<string, string>()
  if (memberIds.length > 0) {
    const { data: namesData, error: namesError } = await authClient
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", memberIds)

    if (namesError) throw new Error(`failed to read member names: ${namesError.message}`)
    memberNames = new Map(
      ((namesData as { user_id: string; display_name: string }[] | null) ?? []).map((p) => [
        p.user_id,
        p.display_name,
      ]),
    )
  }

  const { data: feedData, error: feedError } = await authClient.rpc("feed_group", {
    p_group_id: group.id,
  })

  if (feedError) throw new Error(`failed to read group feed: ${feedError.message}`)
  const feed = (feedData as FeedGroupRow[] | null) ?? []

  const isApproved = membership?.status === "approved"
  const isPending = membership?.status === "pending"
  const isOwner = group.owner_user_id === user.id
  // F8: moderator can reject/remove members. Owner is implicitly a moderator.
  const isModerator = isOwner || membership?.role === "moderator"

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
            <div className="flex items-center gap-2">
              <Button size="sm" variant="tertiary" isDisabled>
                Aguardando aprovação
              </Button>
              {/* F8 Step 1: cancel own pending request */}
              <form action={cancelPendingMembershipAction}>
                <input type="hidden" name="groupId" value={group.id} />
                <Button type="submit" size="sm" variant="tertiary">
                  Cancelar pedido
                </Button>
              </form>
            </div>
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
            <ul className="space-y-2">
              {members.map((m) => {
                const isSelf = m.user_id === user.id
                const canModerate = isOwner || isModerator
                return (
                  <li
                    key={m.user_id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-muted">{memberNames.get(m.user_id) ?? "Membro"}</span>
                      {m.role !== "member" && (
                        <span className="ml-1 text-xs uppercase tracking-wide text-muted">
                          ({m.role})
                        </span>
                      )}
                      {m.status === "pending" && (
                        <span className="ml-1 text-xs italic text-muted">(pendente)</span>
                      )}
                    </div>
                    {/* F8 Step 1: moderator actions for non-self members */}
                    {canModerate && !isSelf && (
                      <div className="flex shrink-0 gap-1.5">
                        {m.status === "pending" ? (
                          <form action={rejectMembershipAction}>
                            <input type="hidden" name="groupId" value={group.id} />
                            <input type="hidden" name="targetUserId" value={m.user_id} />
                            <Button type="submit" size="sm" variant="tertiary">
                              Rejeitar
                            </Button>
                          </form>
                        ) : null}
                        {m.status === "approved" ? (
                          <form action={removeMemberAction}>
                            <input type="hidden" name="groupId" value={group.id} />
                            <input type="hidden" name="targetUserId" value={m.user_id} />
                            <Button type="submit" size="sm" variant="tertiary">
                              Remover
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            {isOwner && (
              <div className="mt-3 space-y-2">
                <form action={transferOwnershipAction} className="flex items-center gap-2">
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
                          {memberNames.get(m.user_id) ?? "Membro"}
                        </option>
                      ))}
                  </select>
                  <Button type="submit" size="sm" variant="tertiary">
                    Transferir
                  </Button>
                </form>
                {/* F8 Step 2: soft-delete the group */}
                <form action={deleteGroupAction}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <Button type="submit" size="sm" variant="danger">
                    Excluir grupo
                  </Button>
                </form>
              </div>
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
                <FeedPost key={post.id} post={post} index={index} />
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
