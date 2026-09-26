import { redirect } from "next/navigation"
import { indicacoesRedirect } from "../../../lib/indications/legacy-routes"

// As indicações moram na vista Indicações da Comunidade. Este endereço fica
// para que links antigos e o `?pedir=1` continuem chegando lá.

export default async function IndicacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  redirect(indicacoesRedirect(await searchParams))
}
