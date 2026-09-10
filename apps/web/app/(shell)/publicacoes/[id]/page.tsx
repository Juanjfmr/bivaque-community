import { ConversationScreen } from "./conversation-screen"

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ConversationScreen requestId={id} />
}
