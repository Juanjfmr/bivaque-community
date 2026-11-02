"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { EntryError } from "../../components/entry/entry-error"
import { EntryShell } from "../../components/entry/entry-shell"
import { EntrySteps } from "../../components/entry/entry-steps"
import { MaterialFilledButton } from "../../components/material/filled-button"
import { MaterialTextButton } from "../../components/material/text-button"
import { EntryConsent } from "../login/components/entry-consent"
import { recordConsentAction } from "./actions"
import "../login/components/entry-auth.css"

// O passo "Aceite" do protótipo (`renderEntryGoogleConsent` em login.js), que o
// hotfix do PR #104 tornou obrigatório para quem entra pelo Google: o Google não
// passa pelo formulário de cadastro, onde fica a linha do aceite, e sem aceite
// gravado a entrada recusa a conferência do CPF. O desvio que traz a pessoa até
// aqui é do callback (`app/auth/callback/redirect-plan.ts`).
//
// O registro continua no servidor, como antes: `recordConsentAction` resolve o
// autor pelo token da sessão e grava as versões do contrato compartilhado. O
// cookie só é atalho de navegação — a autoridade é a linha no banco.
type ConsentFormProperties = Readonly<{
  consentVersion: number
  email: string | null
  signedIn: boolean
}>

export function ConsentForm({ consentVersion, email, signedIn }: ConsentFormProperties) {
  const router = useRouter()
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async () => {
    if (!accepted) {
      // A frase do protótipo, e o foco na caixa: a recusa precisa apontar para
      // o que falta, não para o botão que a pessoa acabou de apertar.
      setError("Para continuar, aceite a Política de privacidade e o Código de conduta.")
      document.getElementById("en-consent")?.focus()
      return
    }

    setError(null)
    setLoading(true)
    try {
      await recordConsentAction()
      // biome-ignore lint/suspicious/noDocumentCookie: consent cookie requires direct cookie access
      document.cookie = `bivaque-consent-version=${consentVersion}; path=/; max-age=${90 * 24 * 60 * 60}; SameSite=Lax`
      setAccepted(true)
      router.push("/onboarding")
    } catch {
      setError("Não foi possível registrar seu aceite agora. Tente novamente em instantes.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <EntryShell backHref="/signup">
      <div className="en-form">
        <EntrySteps label="Conta" step={1} />
        <h1 className="en-h1">Antes de entrar, as regras.</h1>

        {signedIn ? (
          <p className="en-lead">{`Você entrou com o Google como ${email ?? "sua conta"}.`}</p>
        ) : (
          <p className="en-lead">Entre na sua conta para registrar o aceite.</p>
        )}

        {signedIn ? (
          <>
            <EntryConsent checked={accepted} onChange={setAccepted} />
            <EntryError id="en-err">{error}</EntryError>
            <MaterialFilledButton
              disabled={loading ? true : undefined}
              onClick={handleAccept}
              type="button"
            >
              {loading ? "Registrando..." : "Concordar e continuar"}
            </MaterialFilledButton>
          </>
        ) : (
          <MaterialTextButton href="/login" type="button">
            Entrar
          </MaterialTextButton>
        )}
      </div>
    </EntryShell>
  )
}
