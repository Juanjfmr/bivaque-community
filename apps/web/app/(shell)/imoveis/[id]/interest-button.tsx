"use client"

import { Button } from "@heroui/react"
import type { Route } from "next"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { listingsClient } from "../../../../lib/listings/client"
import { showToast } from "../../../components/bivaque/toast"

// "Tenho interesse" abre a conversa com quem anunciou, a mesma do Mercado
// (open_conversation com contexto "listing"). O botão ficava desligado com a
// promessa de "entrar junto da central de mensagens" — a conversa já existia.

export function PropertyInterestButton({
  listingId,
  ownerUserId,
  isOwner,
  isActive,
}: {
  listingId: string
  ownerUserId: string
  isOwner: boolean
  isActive: boolean
}) {
  const router = useRouter()
  const [opening, setOpening] = useState(false)

  // Quem anunciou já tem "Editar" no topo da página.
  if (isOwner) return null

  if (!isActive) {
    return <p className="text-sm text-muted">Este anúncio não está mais ativo.</p>
  }

  async function open() {
    if (opening) return
    setOpening(true)
    const { data, error } = await listingsClient().rpc("open_conversation", {
      p_other_user_id: ownerUserId,
      p_context_type: "listing",
      p_context_id: listingId,
    })
    if (error) {
      showToast({
        title: "Não foi possível abrir a conversa",
        description: "Tente novamente em instantes.",
        variant: "danger",
      })
      setOpening(false)
      return
    }
    router.push(`/messages?conversation=${data}` as Route)
  }

  return (
    <Button variant="primary" className="min-h-11 w-full" isPending={opening} onPress={open}>
      Tenho interesse
    </Button>
  )
}
