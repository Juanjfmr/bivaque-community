import { createListingClient } from "../../../../lib/listings/ssr-client"
import type { PropertyDraftInput } from "../../../../lib/listings/validation"
import { PropertyForm } from "../property-form"

// RECON-027 — /imoveis/novo. A prancha só desenha o detalhe; o formulário
// reutiliza o ciclo do Mercado para que o anúncio seja cadastrável, com os
// campos específicos de Moradia e sem inventar passos.

const EMPTY: PropertyDraftInput = {
  title: "",
  deal: "rent",
  propertyType: "apartment",
  rent: "",
  condoFee: "",
  iptu: "",
  salePrice: "",
  bedrooms: "",
  suites: "",
  parkingSpots: "",
  areaM2: "",
  description: "",
  neighborhood: "",
  availableFrom: "",
}

export default async function NovoImovelPage() {
  const client = await createListingClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (user === null) {
    throw new Error("Sessão ausente para publicar um imóvel.")
  }

  const localityQuery = await client
    .from("locality_memberships")
    .select("locality_id, localities(city_name, state_code)")
    .eq("kind", "current")
    .maybeSingle()
  if (localityQuery.error) {
    throw new Error(`Falha ao resolver a cidade: ${localityQuery.error.message}`)
  }
  const localityRow = localityQuery.data as unknown as {
    locality_id: string
    localities: { city_name: string; state_code: string } | null
  } | null

  const communitiesQuery = await client
    .from("community_memberships")
    .select("communities(id, name, is_deleted)")
    .eq("user_id", user.id)
    .eq("status", "approved")
  if (communitiesQuery.error) {
    throw new Error(`Falha ao carregar as comunidades: ${communitiesQuery.error.message}`)
  }
  const communities = (
    (communitiesQuery.data ?? []) as unknown as {
      communities: { id: string; name: string; is_deleted: boolean } | null
    }[]
  )
    .map((row) => row.communities)
    .filter(
      (community): community is { id: string; name: string; is_deleted: boolean } =>
        community !== null && community.is_deleted !== true,
    )
    .map((community) => ({ id: community.id, name: community.name }))

  const cityLabel = localityRow?.localities
    ? `${localityRow.localities.city_name}, ${localityRow.localities.state_code}`
    : "sua cidade"

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Novo anúncio de moradia</h1>
      <p className="mt-1 text-sm text-muted">
        Descreva o imóvel e escolha quem pode ver o anúncio.
      </p>
      <div className="mt-6">
        <PropertyForm
          mode="create"
          localityId={localityRow?.locality_id ?? ""}
          cityLabel={cityLabel}
          communities={communities}
          audience={{ kind: "locality", label: `Toda a cidade — ${cityLabel}` }}
          defaults={EMPTY}
        />
      </div>
    </div>
  )
}
