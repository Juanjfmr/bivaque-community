import { redirect } from "next/navigation"
import { listListingAlerts } from "../../../../lib/listings/queries"
import { createListingClient } from "../../../../lib/listings/ssr-client"
import { type AlertLocalityOption, AlertManager } from "./alert-manager"

// RECON-028 — prancha 65, painel 2. A leitura das assinaturas passa pela RLS:
// a tela mostra só os alertas do próprio dono, e a leitura da cidade alimenta o
// select do painel de edição. Falha de query lança; não vira lista vazia.

interface MembershipRow {
  locality_id: string
  localities: { city_name: string; state_code: string } | null
}

export default async function ListingAlertsPage() {
  const client = await createListingClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (user === null) {
    // O middleware já exige sessão no shell; aqui é defesa em profundidade.
    redirect("/login")
  }

  const alerts = await listListingAlerts(client)

  const localityQuery = await client
    .from("locality_memberships")
    .select("locality_id, localities(city_name, state_code)")
    .eq("kind", "current")
  if (localityQuery.error) {
    throw new Error(`Falha ao resolver as cidades: ${localityQuery.error.message}`)
  }

  const localities: AlertLocalityOption[] = (
    (localityQuery.data as unknown as MembershipRow[]) ?? []
  ).map((row) => ({
    id: row.locality_id,
    label: row.localities
      ? `${row.localities.city_name}, ${row.localities.state_code}`
      : row.locality_id,
  }))

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Meus alertas</h1>
        <p className="text-sm text-muted">Acompanhe e gerencie seus alertas de busca</p>
      </header>

      <AlertManager alerts={alerts} localities={localities} />
    </div>
  )
}
