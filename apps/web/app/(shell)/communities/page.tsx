import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import type { CommunityCard, MyMembership } from "./communities-data"
import { CommunitiesScreen } from "./communities-screen"

type CommunityRow = Pick<
  Database["public"]["Tables"]["communities"]["Row"],
  "id" | "name" | "description" | "locality_id"
>
type MembershipRow = Pick<
  Database["public"]["Tables"]["community_memberships"]["Row"],
  "community_id" | "status" | "joined_at"
>
type LocalityRow = Pick<
  Database["public"]["Tables"]["localities"]["Row"],
  "id" | "city_name" | "state_code"
>

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
  const memberships: MyMembership[] = ((membershipData as MembershipRow[] | null) ?? []).map(
    (row) => ({
      communityId: row.community_id,
      status: row.status,
      joinedAt: row.joined_at,
    }),
  )

  let localCommunities: CommunityRow[] = []
  if (viewingLocalityId) {
    const { data, error: communitiesError } = await supabase
      .from("communities")
      .select("id, name, description, locality_id")
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
      .select("id, name, description, locality_id")
      .in("id", missingIds)

    if (othersError) {
      throw new Error(`Falha ao ler as comunidades dos seus pedidos: ${othersError.message}`)
    }
    otherCommunities = (data as CommunityRow[] | null) ?? []
  }

  const allCommunities = [...localCommunities, ...otherCommunities]
  const localityIds = [...new Set(allCommunities.map((row) => row.locality_id))]

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

  const toCard = (row: CommunityRow): CommunityCard => ({
    id: row.id,
    name: row.name,
    description: row.description,
    localityId: row.locality_id,
    cityLabel: cityLabelById.get(row.locality_id) ?? null,
  })

  return (
    <CommunitiesScreen
      localCommunities={localCommunities.map(toCard)}
      memberships={memberships}
      knownCommunities={allCommunities.map(toCard)}
      viewingCityLabel={viewingLocalityId ? (cityLabelById.get(viewingLocalityId) ?? null) : null}
    />
  )
}
