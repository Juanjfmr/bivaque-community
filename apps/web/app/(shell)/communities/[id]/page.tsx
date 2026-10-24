import { redirect } from "next/navigation"
import { vilaRedirectFor } from "../../../components/shell/vila-redirects"

// O detalhe da vila sai da tela (ADR-20261023-comunidade-do-prototipo); o
// endereço antigo leva à Comunidade da cidade. A leitura que alimentava a tela
// (community-detail-loaders.ts) segue no repositório, sem rota.

export default function CommunityDetailPage() {
  redirect(vilaRedirectFor("/communities/[id]"))
}
