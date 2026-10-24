import { redirect } from "next/navigation"
import { vilaRedirectFor } from "../../../../components/shell/vila-redirects"

// Convite de vila sai da tela (ADR-20261023-comunidade-do-prototipo). O
// endereço antigo leva à Comunidade da cidade. O formulário do convite
// (invite-section.tsx) e a ação seguem no repositório, sem rota.

export default function CommunityInvitePage() {
  redirect(vilaRedirectFor("/communities/[id]/invite"))
}
