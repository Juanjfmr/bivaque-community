import { redirect } from "next/navigation"

// PORT-005 (lote 4 da entrada) — ADR-20261022-entrada-do-prototipo, item 3.
//
// Cidade e momento viraram uma tela só, como no protótipo, e a personalização
// (foto, Força, OM, interesses) saiu da entrada: ela vive no perfil, depois. O
// passo antigo continua respondendo para quem tem o endereço salvo, um link
// antigo ou uma aba aberta — e leva para a tela que conclui a entrada, sem
// apagar nada do que o perfil usa fora da entrada (as ações de avatar,
// afiliação e interesses seguem em app/(shell)/profile/).
export default function OnboardingProfileRedirect() {
  redirect("/onboarding/locality")
}
