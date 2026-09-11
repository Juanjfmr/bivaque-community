"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { ConversationInbox } from "./conversation-inbox"

// Compatibilidade com os produtores que ainda apontam para a URL antiga
// (sino de notificacao em deep-links.ts, botao "Conversar" do prestador):
// ?conversation=<id> passa a redirecionar para a URL estavel /messages/<id>.

export default function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetConversationId = searchParams.get("conversation")

  useEffect(() => {
    if (targetConversationId && /^[0-9a-f-]{36}$/i.test(targetConversationId)) {
      router.replace(`/messages/${targetConversationId}`)
    }
  }, [targetConversationId, router])

  return <ConversationInbox activeConversationId={null} />
}
