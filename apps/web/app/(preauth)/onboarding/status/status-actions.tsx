"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { MaterialTextButton } from "../../../components/material/text-button"

// PORT-004: a análise é decidida no servidor, então a única ação honesta nesta
// tela é perguntar de novo. O protótipo simulava a aprovação com um controle de
// teste; no Next a decisão é do operador, e recarregar é o caminho real de quem
// quer ver se liberou. O "Sair" saiu daqui para o topo da casca, como no
// protótipo (`entryTop`).
export function StatusActions() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <MaterialTextButton
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          router.refresh()
        })
      }}
    >
      {pending ? "Atualizando…" : "Atualizar situação"}
    </MaterialTextButton>
  )
}
