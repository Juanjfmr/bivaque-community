import { redirect } from "next/navigation"
import { vilaRedirectFor } from "../../../components/shell/vila-redirects"

// O aceite do convite de vila sai da tela (ADR-20261023-comunidade-do-prototipo):
// o ADR move o convite para o grupo (lote 5 B, "Convite é um link para a tela do
// grupo"), então o endereço antigo leva à Comunidade da cidade. A RPC
// `accept_community_invitation` e o pgTAP do convite (supabase/tests/
// community-invitations.sql) continuam no banco — nada é apagado.

export default function InviteAcceptPage() {
  redirect(vilaRedirectFor("/invite/[token]"))
}
