import { redirect } from "next/navigation"
import { recommendationsRedirect } from "../../../lib/indications/legacy-routes"

// /recommendations foi aposentada em 25/09/2026 (ADR-20260925-memoria-de-indicacoes):
// pedir, responder e resolver moram na vista Indicações da Comunidade, grupos em
// /groups, encontros em /events e salvos em /salvos. O endereço fica para que
// links antigos (notificação, compartilhamento, favoritos) ainda cheguem ao lugar
// certo.

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  redirect(recommendationsRedirect(await searchParams))
}
