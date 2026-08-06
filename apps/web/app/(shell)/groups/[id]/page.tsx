import { Button } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"
import { FeedPost } from "../../../components/bivaque/feed-post"

type GroupRow = Database["public"]["Tables"]["groups"]["Row"]
type MembershipRow = Database["public"]["Tables"]["group_memberships"]["Row"]
type FeedGroupRow = Database["public"]["Functions"]["feed_group"]["Returns"][number]
type MemberRow = MembershipRow & {
  profiles: { display_name: string } | null
}

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

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params

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
    redirect(`/login?return=/groups/${groupId}`)
  }

  const supabase = createServiceClient()

  const { data: groupData } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .eq("is_deleted", false)
    .maybeSingle()

  const group = groupData as GroupRow | null
  if (!group) {
    redirect("/groups")
  }

  const { data: membershipData } = await supabase
    .from("group_memberships")
    .select("*")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle()

  const membership = membershipData as MembershipRow | null

  const { data: membersData } = await supabase
    .from("group_memberships")
    .select("user_id, role, status, joined_at, profiles:profiles!inner(display_name)")
    .eq("group_id", group.id)
    .eq("status", "approved")
    .limit(10)

  const members = (membersData as MemberRow[] | null) ?? []

  const { data: feedData } = await supabase.rpc("feed_group", { p_group_id: group.id })
  const feed = (feedData as FeedGroupRow[] | null) ?? []

  const isApproved = membership?.status === "approved"
  const isPending = membership?.status === "pending"

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
