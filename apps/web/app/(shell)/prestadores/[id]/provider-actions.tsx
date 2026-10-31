"use client"

import { Mail, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { BusinessDetails } from "../../../../lib/providers/business-details"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { showToast } from "../../../components/bivaque/toast"
import { Button } from "../../../components/ui/button"

// Prancha 62 — os dois botões da ficha: `Pedir serviço` (primário, abre o
// formulário de pedido com o destinatário fixo na URL) e `Entrar em contato`
// (secundário, abre a conversa contextual pelo RPC idempotente). O contato
// NÃO revela telefone nem outro canal automaticamente: a porta é a conversa.
export function ProviderActions({
  providerId,
  providerUserId,
  contact,
}: {
  providerId: string
  providerUserId: string
  contact?: BusinessDetails
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
    <div className="flex flex-col gap-3">
      <Button
        variant="primary"
        onClick={() => router.push(`/pedidos/novo?prestador=${providerId}`)}
        className="min-h-11 flex-1"
      >
        <MessageCircle size={18} aria-hidden="true" />
        Pedir orçamento
      </Button>
      {contact?.contact_is_public && contact.contact_phone && contact.contact_mode !== "app" ? (
        <a
          href={
            contact.contact_mode === "whatsapp"
              ? `https://wa.me/${contact.contact_phone.replace(/\D/g, "")}`
              : `tel:${contact.contact_phone}`
          }
          target={contact.contact_mode === "whatsapp" ? "_blank" : undefined}
          rel={contact.contact_mode === "whatsapp" ? "noopener noreferrer" : undefined}
          className="inline-flex min-h-11 items-center justify-center rounded-ui border border-ui-line px-4 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-brand"
        >
          {contact.contact_mode === "whatsapp" ? "WhatsApp do negócio" : "Ligar para o negócio"}
        </a>
      ) : null}
      <Button variant="secondary" onClick={openConversation} disabled={opening} className="w-full">
        <Mail size={18} aria-hidden="true" />
        {opening ? "Abrindo…" : "Entrar em contato"}
      </Button>
    </div>
  )
}
