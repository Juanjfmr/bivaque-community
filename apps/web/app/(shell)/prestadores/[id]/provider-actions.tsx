"use client"

import { Button } from "@heroui/react"
import { Mail, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { showToast } from "../../../components/bivaque/toast"

// Prancha 62 — os dois botões da ficha: `Pedir serviço` (primário, abre o
// formulário de pedido com o destinatário fixo na URL) e `Entrar em contato`
// (secundário, abre a conversa contextual pelo RPC idempotente). O contato
// NÃO revela telefone nem outro canal automaticamente: a porta é a conversa.
export function ProviderActions({
  providerId,
  providerUserId,
}: {
  providerId: string
  providerUserId: string
}) {
  const router = useRouter()
  const [opening, setOpening] = useState(false)

  async function openConversation() {
    setOpening(true)
    const supabase = createBrowserClient()
    const { data, error } = await supabase.rpc("open_conversation", {
      p_other_user_id: providerUserId,
      p_context_type: "provider",
      p_context_id: providerId,
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
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        variant="primary"
        onPress={() => router.push(`/pedidos/novo?prestador=${providerId}`)}
        className="min-h-11 flex-1"
      >
        <MessageCircle size={18} aria-hidden="true" />
        Pedir serviço
      </Button>
      <Button
        variant="secondary"
        onPress={openConversation}
        isDisabled={opening}
        className="min-h-11 flex-1 border border-border bg-transparent text-[var(--semantic-text-primary)] transition-colors"
      >
        <Mail size={18} aria-hidden="true" />
        {opening ? "Abrindo…" : "Entrar em contato"}
      </Button>
    </div>
  )
}
