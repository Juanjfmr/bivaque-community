import { ConversasInbox } from "./conversas-inbox"

// FIGMA-001 — caixa de conversas do shell do membro. A apresentação e a
// orquestração vivem em conversas-inbox.tsx / conversas-loaders.ts e são
// compartilhadas com o painel do prestador (/prestador/conversas), sem
// duplicar loaders nem thread.
export default function MessagesPage() {
  return <ConversasInbox />
}
