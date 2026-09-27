import { notFound, redirect } from "next/navigation"
import { createListingClient } from "../../../../lib/listings/ssr-client"
import { CityConsult } from "./city-consult"

// Consulta a outra cidade (decisão do dono, 25/09/2026). O chip de cidade do
// cabeçalho leva aqui: o Guia, os encontros abertos à cidade e os anúncios de
// alcance cidade de QUALQUER cidade, só para ler. A regra de leitura está na
// migration 20260925161111_consulta_outra_cidade; publicar continua exigindo
// pertencer à cidade.
//
// O servidor resolve só a cidade: id fora do formato ou fora do catálogo é
// 404, e a própria cidade volta ao Início (consultar a sua é o Início).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function CidadePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()

  const client = await createListingClient()
  const [cityResult, homeResult] = await Promise.all([
    client.from("localities").select("id, city_name, state_code").eq("id", id).maybeSingle(),
    client.from("locality_memberships").select("locality_id").eq("kind", "current").maybeSingle(),
  ])
  if (cityResult.error) {
    throw new Error(`Falha ao carregar a cidade: ${cityResult.error.message}`)
  }
  if (homeResult.error) {
    throw new Error(`Falha ao resolver a sua cidade: ${homeResult.error.message}`)
  }
  if (cityResult.data === null) notFound()
  if (homeResult.data?.locality_id === id) redirect("/inicio")

  return (
    <CityConsult
      city={{
        id: cityResult.data.id,
        cityName: cityResult.data.city_name,
        stateCode: cityResult.data.state_code,
      }}
    />
  )
}
