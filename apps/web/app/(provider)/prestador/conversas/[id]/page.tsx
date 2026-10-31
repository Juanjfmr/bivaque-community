import type { Metadata } from "next"
import { ConversationRoute } from "../../../../(shell)/messages/[id]/conversation-route"

// FIGMA-001 (reparo rodada 1/3) — detalhe da conversa no painel do prestador,
// endereçável e com volta para a caixa do próprio shell. Identidade e
// autorização continuam na RLS de participante; o provider não vira membro.
export const metadata: Metadata = {
  title: "Conversa · Painel do prestador",
}

export default async function ProviderConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ConversationRoute conversationId={id} backHref="/prestador/conversas" />
}
