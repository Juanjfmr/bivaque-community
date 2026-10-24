import { redirect } from "next/navigation"
import { vilaRedirectFor } from "../../../../components/shell/vila-redirects"

// Indicar prestador numa vila sai da tela (ADR-20261023-comunidade-do-prototipo);
// o endereço antigo leva à Comunidade da cidade. O formulário e a ação seguem no
// repositório, sem rota.

export default function ProviderInvitationPage() {
  redirect(vilaRedirectFor("/communities/[id]/indicar-prestador"))
}
