"use client"

import { useState } from "react"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { EntryError } from "../../../components/entry/entry-error"
import { EntryShell } from "../../../components/entry/entry-shell"
import { MaterialConfirmDialog } from "../../../components/material/confirm-dialog"
import { MaterialFilledButton } from "../../../components/material/filled-button"
import { MaterialOutlinedButton } from "../../../components/material/outlined-button"
import "./entry-auth.css"

// "Você já começou" — `renderEntryResume` em account.js.
//
// Mora como estado das duas telas que a especificação usa para chegar na
// entrada (`/login` e `/signup`), decidido no servidor por `readEntrySession`:
// quem tem sessão e ainda não é membro está no meio do funil, e é exatamente
// quem precisa poder retomar. Ver `lib/auth/entry-progress.ts`.
//
// O que muda em relação ao protótipo, e por quê:
//   - "Continuar de onde parei" leva ao passo onde a entrada parou, decidido no
//     servidor por `entryResumeTarget`: conta sem aceite gravado retoma no passo
//     Aceite (senão a conferência do CPF recebia `403 consent is required`), e
//     o proxy resolve CPF, análise ou cidade quando o aceite já existe. O
//     protótipo calculava o passo no dispositivo porque era ali que o estado
//     vivia;
//   - "Começar com outra conta" sai da conta e volta ao cadastro, em vez de
//     apagar um estado local — no Next a entrada mora na conta, não no
//     aparelho. A frase de apoio diz isso, porque a do protótipo ("Começar de
//     novo apaga esta entrada neste dispositivo") seria falsa aqui;
//   - o "Entrar" do topo do protótipo não aparece: nesta tela ele apontaria
//     para a própria entrada, e a escolha já são os dois botões.
//
// "Continuar de onde parei" é link de verdade (`href`), não botão com
// `router.push`: navegação é o que o leitor de tela anuncia e o que funciona
// antes da hidratação.
type EntryResumeProperties = Readonly<{
  email: string | null
  name: string | null
  /** `entryResumeTarget` — decidido no servidor, nunca na tela. */
  resumeHref: string
}>

export function EntryResume({ email, name, resumeHref }: EntryResumeProperties) {
  const [confirming, setConfirming] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const account = [name, email].filter((value): value is string => Boolean(value)).join(" · ")

  const handleRestart = async () => {
    setConfirming(false)
    setLeaving(true)
    setProblem(null)
    try {
      const { error } = await createBrowserClient().auth.signOut()
      if (error) throw error
      // Navegação completa: o cadastro é servidor e precisa ver os cookies já
      // apagados, senão a pessoa cai em "Você já começou" outra vez.
      window.location.assign("/signup")
    } catch {
      setProblem("Não foi possível sair desta conta agora. Tente de novo.")
      setLeaving(false)
    }
  }

  return (
    <EntryShell>
      <div className="en-form">
        <h1 className="en-h1">Você já começou a entrada.</h1>
        {account.length > 0 ? <p className="en-lead">{`Conta de ${account}`}</p> : null}

        <MaterialFilledButton href={resumeHref} type="button">
          Continuar de onde parei
        </MaterialFilledButton>

        <MaterialOutlinedButton
          disabled={leaving ? true : undefined}
          onClick={() => {
            setConfirming(true)
          }}
          type="button"
        >
          Começar com outra conta
        </MaterialOutlinedButton>

        <EntryError id="en-err">{problem}</EntryError>

        <p className="en-hint">Começar de novo sai desta conta e volta ao cadastro.</p>
      </div>

      <MaterialConfirmDialog
        confirmLabel="Confirmar"
        onCancel={() => {
          setConfirming(false)
        }}
        onConfirm={() => {
          void handleRestart()
        }}
        open={confirming}
        text="Você sai desta conta e volta ao cadastro."
        title="Começar com outra conta?"
      />
    </EntryShell>
  )
}
