import { ConversasInbox } from "../../../(shell)/messages/conversas-inbox"

// FIGMA-001 (reparo rodada 1/3, 06/10/2026) — caixa de conversas do PRESTADOR.
// O dono da ficha é participante autorizado pelas policies existentes de
// dm_conversations/dm_messages (participante, não localidade); antes desta
// rota o painel apontava para /messages, que o proxy devolve ao painel e o
// layout do membro recusa — a resposta real pedida pelo dono ficava
// inalcançável. Apresentação e loaders compartilhados, RLS inalterada.
// Reparos finais (06/10/2026): audience="provider" — a caixa do dono descreve
// pedidos de membros; a copy do consumidor permanece a do shell do membro.
export default function ProviderConversasPage() {
  return <ConversasInbox inboxBase="/prestador/conversas" audience="provider" />
}
