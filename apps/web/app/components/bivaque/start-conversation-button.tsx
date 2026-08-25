"use client"

import { Button } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import { showToast } from "./toast"

// Onda G Task 6 — o botão "Conversar" da ficha. Só o MEMBRO vê este botão
// (a página só renderiza para quem pode ver a ficha, e quem pode ver nunca é
// o dono dela). O RPC é idempotente: reabrir devolve a mesma conversa.

export function StartConversationButton({
  providerUserId,
  profileId,
}: {
  providerUserId: string
  profileId: string
}) {
  const router = useRouter()
  const [opening, setOpening] = useState(false)

  async function open() {
    setOpening(true)
    const supabase = createBrowserClient()
    const { data, error } = await supabase.rpc("open_conversation", {
      p_other_user_id: providerUserId,
      p_context_type: "provider",
      p_context_id: profileId,
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
    router.push(`/messages?conversation=${data}`)
  }

  return (
    <Button onPress={open} isDisabled={opening} variant="primary" size="md">
      {opening ? "Abrindo…" : "Conversar"}
    </Button>
  )
}
