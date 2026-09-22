// RECON-009 — orquestração de leitura da comunidade (prancha 43), separada dos
// componentes para ser testável no ambiente node do Vitest da casa (sem DOM).
//
// A cerca de privacidade mora aqui, e não no JSX: as consultas que só o membro
// aprovado pode ver (grupos, contagem de membros, feed, roster para
// transferência) NEM SEQUER SÃO EMITIDAS para pendente/visitante — a RLS já não
// deixaria ler, e o contrato proíbe carregar para esconder depois. O motivo do
// pedido é lido apenas na via pendente, pela própria linha do solicitante
// (policy `community_join_reasons_select_author_or_moderator`).
//
// Falha de consulta LANÇA — renderizar lista vazia no lugar de uma consulta que
// falhou é o bug que a casa proíbe; o erro sobe para o error boundary do
// segmento (`communities/error.tsx`), que oferece nova tentativa.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { signCommunityImageUrls } from "../../../../lib/communities/community-image-urls"
import {
  buildGroupCards,
  enterableGroupIds,
  type GroupRowLite,
  type MembershipLite,
  type MyGroupMembershipLite,
  resolveAudience,
} from "./community-detail-data"

type CommunityDetailClient = SupabaseClient<Database>

type CommunityRow = Pick<
  Database["public"]["Tables"]["communities"]["Row"],
  "id" | "name" | "description" | "locality_id" | "created_at" | "banner_path" | "thumbnail_path"
>
type MyMembershipRow = Pick<
  Database["public"]["Tables"]["community_memberships"]["Row"],
  "role" | "status" | "joined_at"
>
type LocalityRow = Pick<
  Database["public"]["Tables"]["localities"]["Row"],
  "city_name" | "state_code"
>
type FeedCommunityRow = Database["public"]["Functions"]["feed_community"]["Returns"][number]

export type CommunityPresentation = {
  id: string
  name: string
  description: string | null
  /** Rótulo real da cidade ("Manaus, AM"), resolvido de `localities`. */
  cityLabel: string | null
  /** `communities.created_at` — exibida só onde o público pode ver. */
  createdAt: string
  /** URL assinada da faixa atual, ou `null` quando não há imagem. */
  bannerUrl: string | null
  /** URL assinada da miniatura atual, ou `null` quando não há imagem. */
  thumbnailUrl: string | null
}

export type TransferCandidate = {
  userId: string
  displayName: string
}

export type CommunityDetailView =
  | {
      status: "not-found"
    }
  | {
      status: "ready"
      audience: "visitor"
      presentation: CommunityPresentation
    }
  // Quem NÃO é membro da cidade vê a apresentação (o dono decidiu em 15/09/2026
  // que nome e estado da comunidade não são sigilosos) mas não vê o corpo de
  // participação: pedir entrada exige ser da cidade, e é o RPC que barra.
  | {
      status: "ready"
      audience: "outsider"
      presentation: CommunityPresentation
    }
  | {
      status: "ready"
      audience: "pending"
      presentation: CommunityPresentation
      /** `joined_at` da minha própria linha — data real do pedido. */
      requestedAt: string
      /** Resumo somente leitura para o autor; `null` quando não houve motivo. */
      joinReason: string | null
    }
  | {
      status: "ready"
      audience: "member"
      presentation: CommunityPresentation
      membership: MembershipLite
      canModerate: boolean
      /** Contagem exata de aprovados — carregada só porque quem lê é membro. */
      memberCount: number
      groups: ReturnType<typeof buildGroupCards>
      feed: FeedCommunityRow[]
      /** Roster para o seletor de transferência — só o dono carrega isto. */
      transferCandidates: TransferCandidate[]
    }

/**
 * Nome da cidade da comunidade. A sessão lê primeiro (a RLS de `localities` só abre a
 * cidade de quem é de lá). Para quem é de fora a leitura volta vazia, e a tela de acesso
 * indisponível dizia "fica em outra cidade" (COMM-CIDADE-ROTULO). O nome e a UF são o
 * catálogo IBGE que /api/localities já serve a qualquer pessoa; o recurso lê SÓ essas duas
 * colunas, só desta localidade, e não abre nada da vida da cidade.
 */
export async function resolveCityLabel(
  supabase: CommunityDetailClient,
  catalog: CommunityDetailClient | null,
  localityId: string,
): Promise<string | null> {
  const read = async (client: CommunityDetailClient) => {
    const { data, error } = await client
      .from("localities")
      .select("city_name, state_code")
      .eq("id", localityId)
      .maybeSingle()
    if (error) throw new Error("Falha ao ler a cidade da comunidade.")
    return data as LocalityRow | null
  }

  const row = (await read(supabase)) ?? (catalog ? await read(catalog) : null)
  return row ? `${row.city_name}, ${row.state_code}` : null
}

export async function loadCommunityDetail(
  supabase: CommunityDetailClient,
  communityId: string,
  userId: string,
  catalog: CommunityDetailClient | null = null,
): Promise<CommunityDetailView> {
  const { data: communityData, error: communityError } = await supabase
    .from("communities")
    .select("id, name, description, locality_id, created_at, banner_path, thumbnail_path")
    .eq("id", communityId)
    .eq("is_deleted", false)
    .maybeSingle()

  if (communityError) {
    throw new Error("Falha ao ler a comunidade.")
  }
  if (!communityData) {
    return { status: "not-found" }
  }
  const community = communityData as CommunityRow

  // A minha própria linha de participação é sempre legível por mim (cláusula
  // `user_id = auth.uid()` da policy) — é ela que decide o público da tela.
  const { data: myData, error: myError } = await supabase
    .from("community_memberships")
    .select("role, status, joined_at")
    .eq("community_id", community.id)
    .eq("user_id", userId)
    .maybeSingle()

  if (myError) {
    throw new Error("Falha ao ler a sua participação.")
  }
  const mine = myData as MyMembershipRow | null

  // Ser da cidade é o que separa "posso pedir entrada" de "só posso ver que
  // existe". A leitura é da PRÓPRIA linha de localidade (RLS `user_id =
  // auth.uid()`), então não depende de nada que o cliente informe.
  const { data: localityMembership, error: localityMembershipError } = await supabase
    .from("locality_memberships")
    .select("locality_id")
    .eq("user_id", userId)
    .eq("locality_id", community.locality_id)
    .eq("kind", "current")
    .maybeSingle()

  if (localityMembershipError) {
    throw new Error("Falha ao ler a sua localidade.")
  }

  const audience = localityMembership
    ? resolveAudience(mine ? { role: mine.role, status: mine.status } : null)
    : ("outsider" as const)

  const cityLabel = await resolveCityLabel(supabase, catalog, community.locality_id)

  const imageUrls = (
    await signCommunityImageUrls(supabase, [
      {
        communityId: community.id,
        banner: community.banner_path !== null,
        thumbnail: community.thumbnail_path !== null,
      },
    ])
  ).get(community.id) ?? { bannerUrl: null, thumbnailUrl: null }

  const presentation: CommunityPresentation = {
    id: community.id,
    name: community.name,
    description: community.description,
    cityLabel,
    createdAt: community.created_at,
    bannerUrl: imageUrls.bannerUrl,
    thumbnailUrl: imageUrls.thumbnailUrl,
  }

  if (audience === "visitor" || audience === "outsider") {
    // Visitante (da cidade, sem participação) e quem não é da cidade: só a
    // apresentação. Nada de grupos, contagem, feed ou motivo — essas consultas
    // não chegam a ser emitidas.
    return { status: "ready", audience, presentation }
  }

  if (audience === "pending") {
    // O motivo pertence ao pedido: a linha é do autor e a policy dele a libera.
    const { data: reasonRow, error: reasonError } = await supabase
      .from("community_join_reasons")
      .select("reason")
      .eq("community_id", community.id)
      .eq("user_id", userId)
      .maybeSingle()

    if (reasonError) {
      throw new Error("Falha ao ler o motivo do seu pedido.")
    }
    const reason = reasonRow as { reason: string } | null
    return {
      status: "ready",
      audience: "pending",
      presentation,
      requestedAt: mine?.joined_at ?? "",
      joinReason: reason?.reason ?? null,
    }
  }

  // ── membro aprovado ────────────────────────────────────────────────────────
  const membership: MembershipLite = { role: mine?.role ?? "member", status: "approved" }

  const [groupsResult, myGroupsResult, countResult, feedResult] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, description, visibility")
      .eq("community_id", community.id)
      .eq("is_deleted", false)
      .order("name"),
    supabase.from("group_memberships").select("group_id, status").eq("user_id", userId),
    supabase
      .from("community_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("community_id", community.id)
      .eq("status", "approved"),
    supabase.rpc("feed_community", { p_community_id: community.id, p_order: "recent" }),
  ])

  if (groupsResult.error) {
    throw new Error("Falha ao ler os grupos da comunidade.")
  }
  if (myGroupsResult.error) {
    throw new Error("Falha ao ler as suas participações em grupos.")
  }
  if (countResult.error) {
    throw new Error("Falha ao contar os membros da comunidade.")
  }
  if (countResult.count === null) {
    // Contagem pedida e não devolvida sem erro declararia "0 membros" — é
    // falha de leitura, não estado vazio.
    throw new Error("Falha ao contar os membros da comunidade.")
  }
  if (feedResult.error) {
    throw new Error("Falha ao ler as publicações da comunidade.")
  }

  const groups = (groupsResult.data as GroupRowLite[] | null) ?? []
  const myGroupIds = new Set(groups.map((group) => group.id))
  const myMemberships = ((myGroupsResult.data as MyGroupMembershipLite[] | null) ?? []).filter(
    (row) => myGroupIds.has(row.group_id),
  )

  // A contagem por grupo só é consultada onde a RLS devolve a lista inteira
  // (público) ou onde eu participo (privado) — os ids vêm da permissão real.
  const approvedCountByGroupId = new Map<string, number>()
  const enterable = enterableGroupIds(groups, myMemberships)
  if (enterable.length > 0) {
    const { data: memberRows, error: memberRowsError } = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("status", "approved")
      .in("group_id", enterable)
    if (memberRowsError) {
      throw new Error("Falha ao ler os membros dos grupos.")
    }
    for (const row of (memberRows as { group_id: string }[] | null) ?? []) {
      approvedCountByGroupId.set(row.group_id, (approvedCountByGroupId.get(row.group_id) ?? 0) + 1)
    }
  }

  // O roster completa só quem pode transferir a comunidade: o dono, para o
  // seletor de transferência — nunca uma lista de participantes exposta.
  const transferCandidates: TransferCandidate[] = []
  if (membership.role === "owner") {
    const { data: roster, error: rosterError } = await supabase
      .from("community_memberships")
      .select("user_id")
      .eq("community_id", community.id)
      .eq("status", "approved")
      .neq("user_id", userId)
      .limit(50)
    if (rosterError) {
      throw new Error("Falha ao ler os membros da comunidade.")
    }
    const memberIds = ((roster as { user_id: string }[] | null) ?? []).map((row) => row.user_id)
    if (memberIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", memberIds)
      if (profilesError) {
        throw new Error("Falha ao ler os nomes dos membros.")
      }
      const names = new Map(
        ((profiles as { user_id: string; display_name: string }[] | null) ?? []).map((row) => [
          row.user_id,
          row.display_name,
        ]),
      )
      for (const id of memberIds) {
        transferCandidates.push({ userId: id, displayName: names.get(id) ?? "Membro" })
      }
    }
  }

  return {
    status: "ready",
    audience: "member",
    presentation,
    membership,
    canModerate: membership.role !== "member",
    memberCount: countResult.count,
    groups: buildGroupCards(groups, myMemberships, approvedCountByGroupId),
    feed: (feedResult.data as FeedCommunityRow[] | null) ?? [],
    transferCandidates,
  }
}
