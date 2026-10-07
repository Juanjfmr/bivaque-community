import type { Metadata } from "next"
import { ConversationRoute } from "./conversation-route"

// FIGMA-001 — URL estável do detalhe da conversa. A página-servidor só abre o
// param de rota; identidade e autorização continuam sendo resolvidas no
// cliente autenticado e, sobretudo, na RLS de dm_conversations/dm_messages.
export const metadata: Metadata = {
  title: "Conversa · Bivaque",
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ConversationRoute conversationId={id} />
}
