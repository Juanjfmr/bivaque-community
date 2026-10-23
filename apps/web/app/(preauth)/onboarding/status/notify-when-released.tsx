"use client"

import { useState, useTransition } from "react"
import { EntryError } from "../../../components/entry/entry-error"
import { MaterialFilledButton } from "../../../components/material/filled-button"
import { MaterialIcon } from "../../../components/material/material-icon"
import { subscribeToReleaseNotice } from "./notify-actions"

// PORT-004: o "Avise-me quando liberar" da análise pendente
// (`renderEntryPending` em account.js). O protótipo confirma "por e-mail e no
// celular"; no Next não existe push, e um controle que promete o que não
// entrega é a tela que mente — a confirmação diz só "por e-mail". A diferença
// está registrada no relatório da frente.
//
// A preferência é gravada no banco pela Server Action; este componente só
// mostra o resultado. O estado inicial vem do servidor, então recarregar a
// página não pergunta de novo.
export function NotifyWhenReleased({ initial }: Readonly<{ initial: boolean }>) {
  const [confirmed, setConfirmed] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (confirmed) {
    return (
      <p className="en-ok" role="status">
        <MaterialIcon name="notifications_active" />
        Vamos avisar por e-mail quando liberar.
      </p>
    )
  }

  return (
    <>
      <MaterialFilledButton
        disabled={pending}
        id="release-notice"
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const result = await subscribeToReleaseNotice()
            if (!result.ok) {
              setError(result.error)
              return
            }
            setConfirmed(true)
          })
        }}
      >
        {pending ? "Registrando…" : "Avise-me quando liberar"}
      </MaterialFilledButton>
      <EntryError>{error}</EntryError>
    </>
  )
}
