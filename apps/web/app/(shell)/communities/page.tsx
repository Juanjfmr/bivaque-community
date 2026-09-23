import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { signCommunityImageUrls } from "../../../lib/communities/community-image-urls"
import {
  type CommunityCard,
  type CommunityGroupCard,
  MY_GROUPS_LIMIT,
  type MyMembership,
} from "./communities-data"
import { CommunitiesScreen } from "./communities-screen"

type CommunityRow = Pick<
  Database["public"]["Tables"]["communities"]["Row"],
  "id" | "name" | "description" | "locality_id" | "banner_path" | "thumbnail_path"
>
type MembershipRow = Pick<
  Database["public"]["Tables"]["community_memberships"]["Row"],
  "community_id" | "status" | "joined_at"
>
type LocalityRow = Pick<
  Database["public"]["Tables"]["localities"]["Row"],
  "id" | "city_name" | "state_code"
>
type GroupRow = Pick<
  Database["public"]["Tables"]["groups"]["Row"],
  "id" | "name" | "description" | "visibility" | "locality_id" | "community_id"
>
type GroupMembershipRow = Pick<Database["public"]["Tables"]["group_memberships"]["Row"], "group_id">

export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ locality?: string | string[] }>
}) {
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

  // P0 Task 7: locality lives in the membership, not the profile — the
  // migration 20260817031237 dropped profiles.locality_id. Mirror the
  // resolution in (shell)/layout.tsx: one membership, ordered by joined_at.
  const { data: localityRows, error: localityMembershipsError } = await supabase
    .from("locality_memberships")
    .select("locality_id")
    .order("joined_at", { ascending: true })

  if (localityMembershipsError) {
    throw new Error(`Falha ao ler as localidades: ${localityMembershipsError.message}`)
  }
  const myLocalityIds = ((localityRows as { locality_id: string }[] | null) ?? []).map(
    (row) => row.locality_id,
  )

  // Same "?locality" convention the events screen uses for the city switcher:
  // a param only selects among localities I actually belong to (anything else
  // falls back to my current city — RLS would return nothing anyway).
  const params = await searchParams
  const requested = typeof params.locality === "string" ? params.locality : null
  const viewingLocalityId =
    requested && myLocalityIds.includes(requested) ? requested : (myLocalityIds[0] ?? null)

  const { data: membershipData, error: membershipsError } = await supabase
    .from("community_memberships")
    .select("community_id, status, joined_at")
    .eq("user_id", user.id)

  if (membershipsError) {
    throw new Error(`Falha ao ler as participações: ${membershipsError.message}`)
  }
  // O motivo do próprio pedido volta como resumo de leitura no estado
  // pendente. A RLS já restringe a tabela ao autor e a quem modera; o filtro
  // por user_id garante que aqui só entre o texto do próprio solicitante,
  // mesmo quando ele modera alguma outra comunidade.
  const { data: reasonData, error: reasonsError } = await supabase
    .from("community_join_reasons")
    .select("community_id, reason")
    .eq("user_id", user.id)

  if (reasonsError) {
    throw new Error(`Falha ao ler os motivos dos pedidos: ${reasonsError.message}`)
  }
  const reasonByCommunity = new Map(
    ((reasonData as { community_id: string; reason: string }[] | null) ?? []).map((row) => [
      row.community_id,
      row.reason,
    ]),
  )

  const memberships: MyMembership[] = ((membershipData as MembershipRow[] | null) ?? []).map(
    (row) => ({
      communityId: row.community_id,
      status: row.status,
      joinedAt: row.joined_at,
      reason: reasonByCommunity.get(row.community_id) ?? null,
    }),
  )

  let localCommunities: CommunityRow[] = []
  if (viewingLocalityId) {
    const { data, error: communitiesError } = await supabase
      .from("communities")
      .select("id, name, description, locality_id, banner_path, thumbnail_path")
      .eq("locality_id", viewingLocalityId)
      .order("name")

    if (communitiesError) {
      throw new Error(`Falha ao ler as comunidades: ${communitiesError.message}`)
    }
    localCommunities = (data as CommunityRow[] | null) ?? []
  }

  // Pedidos pendentes podem apontar para outra cidade (onda T); o painel
  // "Seus pedidos" precisa do nome real delas, então busco por id o que
  // ainda não está na lista local. Linhas que a RLS não deixa ler (vila
  // excluída, cidade fora do meu alcance) simplesmente não aparecem.
  const localIds = new Set(localCommunities.map((row) => row.id))
  const missingIds = memberships
    .map((m) => m.communityId)
    .filter((id) => !localIds.has(id))
    .slice(0, 50)

  let otherCommunities: CommunityRow[] = []
  if (missingIds.length > 0) {
    const { data, error: othersError } = await supabase
      .from("communities")
      .select("id, name, description, locality_id, banner_path, thumbnail_path")
      .in("id", missingIds)

    if (othersError) {
      throw new Error(`Falha ao ler as comunidades dos seus pedidos: ${othersError.message}`)
    }
    otherCommunities = (data as CommunityRow[] | null) ?? []
  }

  const allCommunities = [...localCommunities, ...otherCommunities]

  // ── Grupos: os meus e os da cidade em exibição ─────────────────────────────
  // FE-GRUPOS-ALCANCAVEIS (19/09/2026): o grupo de cidade passa a ter casa no
  // destino Comunidades. Dois conjuntos, e só eles:
  //   * meus grupos — vínculo aprovado, de qualquer cidade;
  //   * grupos SEM comunidade da cidade em exibição — os que não têm outra tela.
  // Grupo de comunidade fica fora de propósito: ele já aparece na aba "Grupos"
  // da própria comunidade, e uma segunda porta para a mesma sala é invenção.
  //
  // Quando os vínculos aprovados passam de `MY_GROUPS_LIMIT`, a lista foi
  // cortada e a tela avisa — o corte não é silencioso. A ordem é por entrada no
  // grupo, para o corte (quando acontece) ser determinístico e significativo.
  //
  // Sem `.limit`: TODOS os vínculos aprovados decidem "participo", inclusive os
  // que ficam fora do teto. Se o teto também decidisse participação, um grupo meu
  // além do corte apareceria como "Entrar" e o clique cairia no conflito de
  // unique. O teto limita só a leitura dos dados do grupo e a URL do `.in` —
  // nunca a resposta sobre pertencimento.
  const { data: myGroupRows, error: myGroupsError } = await supabase
    .from("group_memberships")
    .select("group_id")
    .eq("user_id", user.id)
    .eq("status", "approved")
    .order("joined_at", { ascending: false })

  if (myGroupsError) {
    throw new Error(`Falha ao ler os seus grupos: ${myGroupsError.message}`)
  }
  const participatingGroupIds = new Set(
    ((myGroupRows as GroupMembershipRow[] | null) ?? []).map((row) => row.group_id),
  )
  const myGroupsTruncated = participatingGroupIds.size > MY_GROUPS_LIMIT
  const myGroupIds = [...participatingGroupIds].slice(0, MY_GROUPS_LIMIT)

  const groupColumns = "id, name, description, visibility, locality_id, community_id"
  const groupRowsById = new Map<string, GroupRow>()

  if (myGroupIds.length > 0) {
    const { data, error } = await supabase
      .from("groups")
      .select(groupColumns)
      .in("id", myGroupIds)
      .eq("is_deleted", false)
      .order("name")

    if (error) {
      throw new Error(`Falha ao ler os seus grupos: ${error.message}`)
    }
    for (const row of (data as GroupRow[] | null) ?? []) groupRowsById.set(row.id, row)
  }

  if (viewingLocalityId) {
    const { data, error } = await supabase
      .from("groups")
      .select(groupColumns)
      .eq("locality_id", viewingLocalityId)
      .is("community_id", null)
      .eq("is_deleted", false)
      .order("name")

    if (error) {
      throw new Error(`Falha ao ler os grupos da cidade: ${error.message}`)
    }
    for (const row of (data as GroupRow[] | null) ?? []) groupRowsById.set(row.id, row)
  }

  const groupRows = [...groupRowsById.values()]

  const localityIds = [
    ...new Set([
      ...allCommunities.map((row) => row.locality_id),
      ...groupRows.map((row) => row.locality_id),
    ]),
  ]

  let cityLabelById = new Map<string, string>()
  if (localityIds.length > 0) {
    const { data, error: localitiesError } = await supabase
      .from("localities")
      .select("id, city_name, state_code")
      .in("id", localityIds)

    if (localitiesError) {
      throw new Error(`Falha ao ler as cidades: ${localitiesError.message}`)
    }
    cityLabelById = new Map(
      ((data as LocalityRow[] | null) ?? []).map((row) => [
        row.id,
        `${row.city_name}, ${row.state_code}`,
      ]),
    )
  }

  const imageUrlsByCommunity = await signCommunityImageUrls(
    supabase,
    allCommunities.map((row) => ({
      communityId: row.id,
      banner: row.banner_path !== null,
      thumbnail: row.thumbnail_path !== null,
    })),
  )

  const toCard = (row: CommunityRow): CommunityCard => ({
    id: row.id,
    name: row.name,
    description: row.description,
    localityId: row.locality_id,
    cityLabel: cityLabelById.get(row.locality_id) ?? null,
    bannerUrl: imageUrlsByCommunity.get(row.id)?.bannerUrl ?? null,
    thumbnailUrl: imageUrlsByCommunity.get(row.id)?.thumbnailUrl ?? null,
  })

  // `memberCount` fica `null`: a contagem pela Data API é limitada por
  // `max_rows` (mil linhas por resposta) e um grupo cheio devolveria um número
  // menor que o real sem erro. A tela omite a linha quando o número é nulo —
  // ver o contrato em communities-data.ts.
  const groupCards: CommunityGroupCard[] = groupRows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    visibility: row.visibility,
    localityId: row.locality_id,
    cityLabel: cityLabelById.get(row.locality_id) ?? null,
    cityLevel: row.community_id === null,
    participating: participatingGroupIds.has(row.id),
    memberCount: null,
  }))

  return (
    <CommunitiesScreen
      localCommunities={localCommunities.map(toCard)}
      memberships={memberships}
      knownCommunities={allCommunities.map(toCard)}
      viewingCityLabel={viewingLocalityId ? (cityLabelById.get(viewingLocalityId) ?? null) : null}
      groups={groupCards}
      viewingLocalityId={viewingLocalityId}
      myGroupsTruncated={myGroupsTruncated}
    />
  )
}
