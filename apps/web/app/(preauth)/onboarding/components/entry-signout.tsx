"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { MaterialTextButton } from "../../../components/material/text-button"

// PORT-004: o "Sair" do topo da entrada (`.en-top` em account.js). No protótipo
// ele abandona a entrada e volta para a landing; no Next ele encerra a sessão e
// volta ao login, porque é a sessão que guarda a entrada em andamento — o status
// continua no servidor, e a tela de análise diz isso ("Você pode sair e voltar").
export function EntrySignOut() {
  const router = useRouter()
  const [leaving, setLeaving] = useState(false)

  const signOut = async () => {
    setLeaving(true)
    await createBrowserClient().auth.signOut()
    router.push("/login")
  }

  return (
    <MaterialTextButton
      disabled={leaving}
      onClick={() => {
        void signOut()
      }}
    >
      Sair
    </MaterialTextButton>
  )
}
