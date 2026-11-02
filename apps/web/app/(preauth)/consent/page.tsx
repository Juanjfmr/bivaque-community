import { CONSENT_VERSION } from "@bivaque/domain"
import { readEntrySession } from "../../../lib/auth/entry-session"
import { ConsentForm } from "./consent-form"

// O passo "Aceite" do protótipo, e o desvio do callback (PR #104) que traz aqui
// quem criou a conta pelo Google: essa conta não passou pelo formulário onde o
// aceite é marcado, e sem aceite gravado a entrada recusa a conferência do CPF.
//
// A página lê a sessão no servidor por dois motivos: a saudação do protótipo diz
// com qual conta o aceite está sendo registrado, e quem chega sem sessão (a rota
// é pública, ADR-20260907) precisa de um caminho de volta em vez de um botão que
// só falha. A gravação em si continua na Server Action, com o autor vindo do
// token.
export const dynamic = "force-dynamic"

export default async function ConsentPage() {
  const session = await readEntrySession()

  return (
    <ConsentForm
      consentVersion={CONSENT_VERSION}
      email={session.email}
      signedIn={session.hasSession}
    />
  )
}
