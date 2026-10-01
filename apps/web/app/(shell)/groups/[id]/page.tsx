// biome-ignore-all format: temporary v42 migration validation; remove after local Biome write pass
import { Button } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { ArrowLeft, BookOpen, Search, Settings2, UsersRound } from "lucide-react"
import type { Route } from "next"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { FeedPost } from "../../../components/bivaque/feed-post"
import styles from "../groups-v42.module.css"

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

  // block_soft_delete_groups only allows the is_deleted toggle from
  // service_role — a plain update through the authenticated client always
  // threw. delete_group is a security definer RPC (same ownership check as
  // transfer_group_ownership) that runs the toggle as its owner instead.
  const { error } = await supabase.rpc("delete_group", { p_group_id: groupId })
  if (error) throw new Error(error.message)

  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/groups")
}


async function approveMembershipAction(formData: FormData) {
  "use server"
  const groupId = formData.get("groupId")
  const targetUserId = formData.get("targetUserId")
  if (typeof groupId !== "string" || !groupId) throw new Error("groupId required")
  if (typeof targetUserId !== "string" || !targetUserId) throw new Error("targetUserId required")
  const supabase = await getAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")
  const { error } = await supabase.rpc("approve_group_member", {
    p_group_id: groupId,
    p_user_id: targetUserId,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/groups/${groupId}`)
  revalidatePath("/groups")
}

async function addModeratorAction(formData: FormData) {
  "use server"
  const groupId = formData.get("groupId")
  const targetUserId = formData.get("targetUserId")
  if (typeof groupId !== "string" || !groupId) throw new Error("groupId required")
  if (typeof targetUserId !== "string" || !targetUserId) throw new Error("targetUserId required")
  const supabase = await getAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")
  const { error } = await supabase.rpc("add_group_moderator", {
    p_group_id: groupId,
    p_user_id: targetUserId,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/groups/${groupId}`)
}

async function removeModeratorAction(formData: FormData) {
  "use server"
  const groupId = formData.get("groupId")
  const targetUserId = formData.get("targetUserId")
  if (typeof groupId !== "string" || !groupId) throw new Error("groupId required")
  if (typeof targetUserId !== "string" || !targetUserId) throw new Error("targetUserId required")
  const supabase = await getAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")
  const { error } = await supabase.rpc("remove_group_moderator", {
    p_group_id: groupId,
    p_user_id: targetUserId,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/groups/${groupId}`)
}

export {
  addModeratorAction,
  approveMembershipAction,
  cancelPendingMembershipAction,
  deleteGroupAction,
  joinGroupAction,
  leaveGroupAction,
  rejectMembershipAction,
  removeMemberAction,
  removeModeratorAction,
  transferOwnershipAction,
}

type GroupSearchParams = {
  tab?: string | string[]
  q?: string | string[]
  filter?: string | string[]
  order?: string | string[]
  page?: string | string[]
  memberPage?: string | string[]
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? ""
}

function positivePage(value: string | string[] | undefined) {
  const parsed = Number.parseInt(firstParam(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<GroupSearchParams>
}) {
  const { id: groupId } = await params
  const rawSearch = await searchParams
  const tabValue = firstParam(rawSearch.tab)
  const tab = tabValue === "references" || tabValue === "about" ? tabValue : "conversations"
  const filterValue = firstParam(rawSearch.filter)
  const filter = filterValue === "unanswered" || filterValue === "mine" ? filterValue : "all"
  const orderValue = firstParam(rawSearch.order)
  const order = orderValue === "activity" || orderValue === "oldest" ? orderValue : "recent"
  const query = firstParam(rawSearch.q).trim()
  const page = positivePage(rawSearch.page)
  const memberPage = positivePage(rawSearch.memberPage)

  const authClient = await getAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect(`/login?return=/groups/${groupId}`)

  const { data: groupData, error: groupError } = await authClient
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .eq("is_deleted", false)
    .maybeSingle()
  if (groupError) throw new Error(`failed to read group: ${groupError.message}`)
  const group = groupData as GroupRow | null
  if (!group) notFound()

  const { data: membershipData, error: membershipError } = await authClient
    .from("group_memberships")
    .select("*")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (membershipError) throw new Error(`failed to read membership: ${membershipError.message}`)
  const membership = membershipData as MembershipRow | null

  const isApproved = membership?.status === "approved"
  const isPending = membership?.status === "pending"
  const isOwner = group.owner_user_id === user.id
  const isModerator = isOwner || (isApproved && membership?.role === "moderator")
  const canRead = group.visibility === "public" || isApproved

  let scopeLabel = "Sua cidade"
  if (group.community_id) {
    const { data, error } = await authClient
      .from("communities")
      .select("name")
      .eq("id", group.community_id)
      .maybeSingle()
    if (error) throw new Error(`failed to read group community: ${error.message}`)
    scopeLabel = data?.name ?? "Comunidade"
  } else {
    const { data, error } = await authClient
      .from("localities")
      .select("city_name, state_code")
      .eq("id", group.locality_id)
      .maybeSingle()
    if (error) throw new Error(`failed to read group locality: ${error.message}`)
    if (data) scopeLabel = `${data.city_name} · ${data.state_code}`
  }

  const { count: approvedMemberCount, error: countError } = await authClient
    .from("group_memberships")
    .select("*", { count: "exact", head: true })
    .eq("group_id", group.id)
    .eq("status", "approved")
  if (countError) throw new Error(`failed to count group members: ${countError.message}`)

  const MEMBER_PAGE_SIZE = 20
  let membersRequest = authClient
    .from("group_memberships")
    .select("user_id, role, status, joined_at", { count: "exact" })
    .eq("group_id", group.id)
  if (!isModerator) membersRequest = membersRequest.eq("status", "approved")
  const memberFrom = (memberPage - 1) * MEMBER_PAGE_SIZE
  const {
    data: membersData,
    count: memberTotalCount,
    error: membersError,
  } = await membersRequest
    .order("joined_at", { ascending: true })
    .range(memberFrom, memberFrom + MEMBER_PAGE_SIZE - 1)
  if (membersError) throw new Error(`failed to read members: ${membersError.message}`)
  const members = (membersData as unknown as MemberListRow[] | null) ?? []

  const memberIds = members.map((member) => member.user_id)
  let memberNames = new Map<string, string>()
  if (memberIds.length > 0) {
    const { data, error } = await authClient
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", memberIds)
    if (error) throw new Error(`failed to read member names: ${error.message}`)
    memberNames = new Map(
      ((data as { user_id: string; display_name: string }[] | null) ?? []).map((profile) => [
        profile.user_id,
        profile.display_name,
      ]),
    )
  }

  let feed: FeedGroupRow[] = []
  if (canRead) {
    const { data, error } = await authClient.rpc("feed_group", {
      p_group_id: group.id,
      p_order: order === "activity" ? "activity" : "recent",
    })
    if (error) throw new Error(`failed to read group feed: ${error.message}`)
    feed = (data as FeedGroupRow[] | null) ?? []
  }

  const normalizedQuery = query.toLocaleLowerCase("pt-BR")
  let filteredFeed = feed.filter((post) => {
    if (
      normalizedQuery &&
      !post.content.toLocaleLowerCase("pt-BR").includes(normalizedQuery) &&
      !(post.display_name ?? "").toLocaleLowerCase("pt-BR").includes(normalizedQuery)
    ) return false
    if (filter === "unanswered" && post.comment_count > 0) return false
    if (filter === "mine" && post.user_id !== user.id) return false
    return true
  })
  if (order === "oldest") filteredFeed = [...filteredFeed].reverse()

  const FEED_PAGE_SIZE = 8
  const feedTotal = filteredFeed.length
  const feedPages = Math.max(1, Math.ceil(feedTotal / FEED_PAGE_SIZE))
  const safePage = Math.min(page, feedPages)
  const feedFrom = (safePage - 1) * FEED_PAGE_SIZE
  const visibleFeed = filteredFeed.slice(feedFrom, feedFrom + FEED_PAGE_SIZE)
  const memberPages = Math.max(1, Math.ceil((memberTotalCount ?? 0) / MEMBER_PAGE_SIZE))

  function hrefFor(changes: Partial<{
    tab: string
    q: string
    filter: string
    order: string
    page: number
    memberPage: number
  }>) {
    const next = new URLSearchParams()
    const merged = { tab, q: query, filter, order, page: safePage, memberPage, ...changes }
    if (merged.tab !== "conversations") next.set("tab", merged.tab)
    if (merged.q) next.set("q", merged.q)
    if (merged.filter !== "all") next.set("filter", merged.filter)
    if (merged.order !== "recent") next.set("order", merged.order)
    if (merged.page > 1) next.set("page", String(merged.page))
    if (merged.memberPage > 1) next.set("memberPage", String(merged.memberPage))
    const suffix = next.toString()
    return (`/groups/${group.id}${suffix ? `?${suffix}` : ""}`) as Route
  }

  return (
    <main className={styles["detail"]}>
      <Link href={"/groups" as Route} className={styles["back"]}>
        <ArrowLeft size={17} aria-hidden="true" />
        Todos os grupos
      </Link>

      <div className={styles["cover"]} aria-hidden="true" />
      <header className={styles["identity"]}>
        <div className={styles["identityText"]}>
          <p className={styles["eyebrow"]}>
            {scopeLabel} · {group.visibility === "private" ? "Grupo privado" : "Grupo público neste contexto"}
          </p>
          <h1>{group.name}</h1>
          {group.description ? <p>{group.description}</p> : null}
          <div className={styles["groupMeta"]}>
            <span>{approvedMemberCount ?? 0} participantes</span>
            <span>{feed.length} conversas visíveis</span>
          </div>
        </div>

        <div className={styles["identityActions"]}>
          {isOwner ? (
            <span className={`${styles["badge"]} ${styles["badgeMember"]}`}>Responsável</span>
          ) : isApproved ? (
            <>
              <span className={`${styles["badge"]} ${styles["badgeMember"]}`}>
                {membership?.role === "moderator" ? "Moderação" : "Participando"}
              </span>
              <form action={leaveGroupAction}>
                <input type="hidden" name="groupId" value={group.id} />
                <Button type="submit" size="sm" variant="tertiary">Sair</Button>
              </form>
            </>
          ) : isPending ? (
            <>
              <span className={`${styles["badge"]} ${styles["badgePending"]}`}>Pedido enviado</span>
              <form action={cancelPendingMembershipAction}>
                <input type="hidden" name="groupId" value={group.id} />
                <Button type="submit" size="sm" variant="tertiary">Cancelar pedido</Button>
              </form>
            </>
          ) : (
            <form action={joinGroupAction}>
              <input type="hidden" name="groupId" value={group.id} />
              <Button type="submit" size="sm" variant="primary">
                {group.visibility === "public" ? "Entrar" : "Solicitar entrada"}
              </Button>
            </form>
          )}
        </div>
      </header>

      {!canRead ? (
        <div className={styles["warning"]} role="status">
          As conversas deste grupo são visíveis somente para participantes aprovados.
        </div>
      ) : null}

      <nav className={styles["tabs"]} aria-label="Seções do grupo">
        {([
          ["conversations", "Conversas"],
          ["references", "Referências"],
          ["about", "Sobre"],
        ] as const).map(([key, label]) => (
          <Link
            key={key}
            href={hrefFor({ tab: key, page: 1 })}
            className={`${styles["tab"]} ${tab === key ? styles["tabActive"] : ""}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className={styles["workspace"]}>
        <section className={styles["mainColumn"]}>
          {tab === "conversations" ? (
            canRead ? (
              <>
                {isApproved ? (
                  <div className={styles["composerShell"]}>
                    <p>
                      Use <strong>Contribuir</strong> e confirme este grupo como destino antes de publicar.
                    </p>
                  </div>
                ) : null}

                <search aria-label="Buscar no grupo">
                  <form className={styles["feedSearch"]} method="get">
                  <Search size={19} aria-hidden="true" className="text-muted" />
                  <input
                    type="search"
                    name="q"
                    defaultValue={query}
                    placeholder="Buscar perguntas e autoria"
                    aria-label="Buscar perguntas e autoria neste grupo"
                  />
                  {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
                  {order !== "recent" ? <input type="hidden" name="order" value={order} /> : null}
                  <Button type="submit" size="sm" variant="primary">Buscar</Button>
                  </form>
                </search>

                <div className={styles["feedTools"]}>
                  <div className={styles["feedFilters"]}>
                    {([
                      ["all", "Todas"],
                      ["unanswered", "Sem resposta"],
                      ["mine", "Suas publicações"],
                    ] as const).map(([key, label]) => (
                      <Link
                        key={key}
                        href={hrefFor({ filter: key, page: 1 })}
                        className={`${styles["filterButton"]} ${filter === key ? styles["filterActive"] : ""}`}
                      >
                        {label}
                      </Link>
                    ))}
                    <span
                      className={`${styles["filterButton"]} ${styles["disabledFilter"]}`}
                      aria-disabled="true"
                      title="O estado de resolução ainda não faz parte do feed de grupos."
                    >
                      Resolvidas
                    </span>
                  </div>

                  <form method="get" className="flex items-center gap-2">
                    {query ? <input type="hidden" name="q" value={query} /> : null}
                    {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
                    <select name="order" defaultValue={order} className={styles["sort"]} aria-label="Ordenar conversas">
                      <option value="recent">Mais recentes</option>
                      <option value="activity">Mais respostas</option>
                      <option value="oldest">Mais antigas</option>
                    </select>
                    <Button type="submit" size="sm" variant="secondary">Ordenar</Button>
                  </form>
                </div>

                <div className={styles["summary"]}>
                  <span>
                    {feedTotal === 0
                      ? "Nenhuma conversa encontrada"
                      : `${feedFrom + 1}–${Math.min(feedFrom + FEED_PAGE_SIZE, feedTotal)} de ${feedTotal}`}
                  </span>
                </div>

                {visibleFeed.length > 0 ? (
                  <div className={styles["feedList"]}>
                    {visibleFeed.map((post, index) => (
                      <FeedPost key={post.id} post={post} index={index} />
                    ))}
                  </div>
                ) : (
                  <div className={styles["empty"]}>
                    <h2>{query || filter !== "all" ? "Nenhum resultado" : "Nenhuma conversa ainda"}</h2>
                    <p>
                      {query || filter !== "all"
                        ? "Ajuste a busca ou os filtros."
                        : "Quando alguém publicar neste grupo, a conversa aparecerá aqui."}
                    </p>
                  </div>
                )}

                {feedPages > 1 ? (
                  <nav className={styles["pagination"]} aria-label="Paginação das conversas">
                    <span>Página {safePage} de {feedPages}</span>
                    <div className={styles["pageActions"]}>
                      <Link
                        href={hrefFor({ page: Math.max(1, safePage - 1) })}
                        className={`${styles["filterButton"]} ${safePage <= 1 ? styles["disabledFilter"] : ""}`}
                      >
                        Anterior
                      </Link>
                      <Link
                        href={hrefFor({ page: Math.min(feedPages, safePage + 1) })}
                        className={`${styles["filterButton"]} ${safePage >= feedPages ? styles["disabledFilter"] : ""}`}
                      >
                        Próxima
                      </Link>
                    </div>
                  </nav>
                ) : null}
              </>
            ) : (
              <div className={styles["empty"]}>
                <h2>Conteúdo indisponível</h2>
                <p>Entre no grupo e aguarde aprovação para acessar as conversas privadas.</p>
              </div>
            )
          ) : null}

          {tab === "references" ? (
            <article className={styles["aboutCard"]}>
              <h2>Referências do grupo</h2>
              <p>
                Nenhuma referência estruturada está vinculada a este grupo no momento.
                O histórico de publicações continua disponível em Conversas.
              </p>
            </article>
          ) : null}

          {tab === "about" ? (
            <div className="grid gap-4">
              <article className={styles["aboutCard"]}>
                <h2>Sobre o grupo</h2>
                <p>{group.description || "Este grupo ainda não possui uma descrição."}</p>
                <p>
                  <strong>Quem pode ler:</strong>{" "}
                  {group.visibility === "private"
                    ? "somente participantes aprovados."
                    : `membros elegíveis de ${scopeLabel}.`}
                </p>
                {group.visibility === "public" ? <p>Público aqui não significa aberto na internet.</p> : null}
                <p><strong>Quem pode publicar:</strong> participantes aprovados no grupo.</p>
              </article>

              <article className={styles["membersCard"]} id="participantes">
                <h2>Participantes</h2>
                {members.length === 0 ? (
                  <p className="text-sm text-muted">Nenhum participante encontrado.</p>
                ) : (
                  <div className={styles["memberList"]}>
                    {members.map((member) => {
                      const self = member.user_id === user.id
                      return (
                        <div key={member.user_id} className={styles["memberRow"]}>
                          <div className={styles["memberInfo"]}>
                            <b>{memberNames.get(member.user_id) ?? (self ? "Você" : "Membro")}</b>
                            <span>
                              {member.status === "pending"
                                ? "Solicitação pendente"
                                : member.role === "owner"
                                  ? "Responsável"
                                  : member.role === "moderator"
                                    ? "Moderação"
                                    : "Participante"}
                            </span>
                          </div>

                          {isModerator && !self ? (
                            <div className={styles["memberActions"]}>
                              {member.status === "pending" ? (
                                <>
                                  <form action={approveMembershipAction}>
                                    <input type="hidden" name="groupId" value={group.id} />
                                    <input type="hidden" name="targetUserId" value={member.user_id} />
                                    <Button type="submit" size="sm" variant="secondary">Aprovar</Button>
                                  </form>
                                  <form action={rejectMembershipAction}>
                                    <input type="hidden" name="groupId" value={group.id} />
                                    <input type="hidden" name="targetUserId" value={member.user_id} />
                                    <Button type="submit" size="sm" variant="tertiary">Recusar</Button>
                                  </form>
                                </>
                              ) : (
                                <>
                                  {member.role === "member" ? (
                                    <form action={addModeratorAction}>
                                      <input type="hidden" name="groupId" value={group.id} />
                                      <input type="hidden" name="targetUserId" value={member.user_id} />
                                      <Button type="submit" size="sm" variant="tertiary">Tornar moderador</Button>
                                    </form>
                                  ) : member.role === "moderator" && isOwner ? (
                                    <form action={removeModeratorAction}>
                                      <input type="hidden" name="groupId" value={group.id} />
                                      <input type="hidden" name="targetUserId" value={member.user_id} />
                                      <Button type="submit" size="sm" variant="tertiary">Remover moderação</Button>
                                    </form>
                                  ) : null}
                                  {member.role !== "owner" ? (
                                    <form action={removeMemberAction}>
                                      <input type="hidden" name="groupId" value={group.id} />
                                      <input type="hidden" name="targetUserId" value={member.user_id} />
                                      <Button type="submit" size="sm" variant="tertiary">Remover</Button>
                                    </form>
                                  ) : null}
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}

                {memberPages > 1 ? (
                  <nav className={styles["pagination"]} aria-label="Paginação dos participantes">
                    <span>Página {memberPage} de {memberPages}</span>
                    <div className={styles["pageActions"]}>
                      <Link
                        href={hrefFor({ tab: "about", memberPage: Math.max(1, memberPage - 1) })}
                        className={`${styles["filterButton"]} ${memberPage <= 1 ? styles["disabledFilter"] : ""}`}
                      >
                        Anterior
                      </Link>
                      <Link
                        href={hrefFor({ tab: "about", memberPage: Math.min(memberPages, memberPage + 1) })}
                        className={`${styles["filterButton"]} ${memberPage >= memberPages ? styles["disabledFilter"] : ""}`}
                      >
                        Próxima
                      </Link>
                    </div>
                  </nav>
                ) : null}

                {isOwner ? (
                  <div className={styles["management"]}>
                    <form action={transferOwnershipAction}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <select name="newOwnerId" required aria-label="Transferir responsabilidade para">
                        <option value="">Transferir responsabilidade…</option>
                        {members
                          .filter((member) => member.status === "approved" && member.user_id !== user.id)
                          .map((member) => (
                            <option key={member.user_id} value={member.user_id}>
                              {memberNames.get(member.user_id) ?? "Membro"}
                            </option>
                          ))}
                      </select>
                      <Button type="submit" size="sm" variant="secondary">Transferir</Button>
                    </form>
                    <form action={deleteGroupAction}>
                      <input type="hidden" name="groupId" value={group.id} />
                      <Button type="submit" size="sm" variant="danger">Encerrar grupo</Button>
                    </form>
                  </div>
                ) : null}
              </article>
            </div>
          ) : null}
        </section>

        <aside className={styles["aside"]}>
          <h2>Encontre no grupo</h2>
          <div className={styles["asideLinks"]}>
            <Link href={hrefFor({ tab: "conversations", filter: "unanswered", page: 1 })}>
              <UsersRound size={17} aria-hidden="true" /> Sem resposta
            </Link>
            <Link href={hrefFor({ tab: "references", page: 1 })}>
              <BookOpen size={17} aria-hidden="true" /> Referências
            </Link>
            <Link href={hrefFor({ tab: "about", page: 1 })}>
              <UsersRound size={17} aria-hidden="true" /> Sobre e participação
            </Link>
            {isModerator ? (
              <Link href={(`${hrefFor({ tab: "about", page: 1 })}#participantes`) as Route}>
                <Settings2 size={17} aria-hidden="true" /> Gerenciar
              </Link>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  )
}
