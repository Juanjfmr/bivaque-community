// Contador de conversas com mensagem nova, para o ícone de conversas do cabeçalho
// (MSG-SEM-ENTRADA, decisão do dono de 22/09/2026).
//
// Conta CONVERSAS, não mensagens: o badge diz "há algo novo aqui", e a caixa mostra
// o número por conversa. A mesma regra da caixa (conversation-inbox.tsx): é nova a
// mensagem de outra pessoa depois do last_read_at do membro; sem estado de leitura,
// a conversa inteira é nova. Função pura — as leituras (RLS) ficam no layout.

export interface ReadState {
  conversation_id: string
  last_read_at: string
}

export interface IncomingMessage {
  conversation_id: string
  created_at: string
}

/** Quantas conversas têm mensagem de terceiros depois da última leitura do membro. */
export function countUnreadConversations(
  readStates: readonly ReadState[],
  incoming: readonly IncomingMessage[],
): number {
  const lastRead = new Map(
    readStates.map((state) => [state.conversation_id, Date.parse(state.last_read_at)]),
  )
  const unread = new Set<string>()
  for (const message of incoming) {
    const read = lastRead.get(message.conversation_id)
    if (read === undefined || Date.parse(message.created_at) > read) {
      unread.add(message.conversation_id)
    }
  }
  return unread.size
}
