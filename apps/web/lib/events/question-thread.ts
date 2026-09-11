// RECON-029 (R34 / prancha 67): regras puras do fio de pergunta ao organizador.
//
// Sem import de servidor: o mesmo módulo é consumido pela rota e pelos testes
// de unidade. A decisão de quem é o destinatário NÃO mora aqui — ela é derivada
// do evento dentro do banco (`public.open_event_question`), nunca do cliente.

/** Teto de conteúdo da mensagem. Coincide com o check de `dm_messages.content`. */
export const QUESTION_MAX_LENGTH = 2000

/** Copy obrigatória da falha de envio (prancha 67): o texto permanece no campo. */
export const QUESTION_SEND_FAILURE_COPY = "Não foi possível enviar. Seu texto foi mantido."

export type QuestionMessage = {
  id: string
  senderId: string
  content: string
  createdAt: string
}

export type ConversationContextRow = {
  id: string
  contextType: string
  contextId: string
}

/**
 * Texto enviável: não vazio depois do trim e dentro do teto. O botão "Enviar"
 * fica desabilitado enquanto o campo está vazio — a mesma régua do servidor.
 */
export function canSendQuestion(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.length > 0 && trimmed.length <= QUESTION_MAX_LENGTH
}

export function normalizeQuestion(text: string): string {
  return text.trim()
}

/**
 * A conversa do fio é SÓ a que aponta para este evento. Uma conversa do par com
 * outro contexto nunca vira o fio exibido: a conversa permanece vinculada ao
 * evento (ADR D2). É pela mesma razão que o banco recusa abrir um contexto novo
 * sobre uma conversa existente de contexto alheio, em vez de sobrescrevê-la.
 */
export function threadConversationForEvent(
  conversations: ConversationContextRow[],
  eventId: string,
): ConversationContextRow | null {
  return (
    conversations.find(
      (conversation) =>
        conversation.contextType === "event_question" && conversation.contextId === eventId,
    ) ?? null
  )
}

export type QuestionViewState = "ask" | "thread" | "organizer"

/**
 * Estado da tela para quem chegou:
 *  - organizador: lista os fios do evento (e abre um quando escolhido);
 *  - membro com fio neste evento: lê e responde;
 *  - membro sem fio: o formulário "Pedir mais informações".
 */
export function deriveQuestionViewState(params: {
  viewerIsOrganizer: boolean
  hasEventThread: boolean
}): QuestionViewState {
  if (params.viewerIsOrganizer) return "organizer"
  return params.hasEventThread ? "thread" : "ask"
}

/**
 * Aviso de destinatário do rail (prancha 67). O destino é declarado com o nome
 * real de quem organiza; sem nome resolvido, a frase continua honesta sobre
 * quem recebe e nunca inventa pessoa.
 */
export function destinationNotice(organizerName: string | null | undefined): string {
  const name = organizerName?.trim()
  return name
    ? `Sua pergunta será enviada a ${name}, que organiza este evento.`
    : "Sua pergunta será enviada a quem organiza este evento."
}

/** O rail abre com o nome da pessoa já no aviso; o rótulo curto repete o destino. */
export function destinationShortLabel(organizerName: string | null | undefined): string {
  const name = organizerName?.trim()
  return name ? `Para ${name}` : "Para quem organiza"
}

export type EventComparable = {
  title: string
  description: string | null
  startsAt: string
  venue: string | null
  status: string
}

/**
 * Espelha a régua de `private.notify_event_change`: alteração relevante é mexer
 * em título, descrição, horário, local ou situação. Só edição que muda algo
 * notifica quem confirmou — a mesma condição que o trigger aplica no banco.
 */
export function hasRelevantEventChange(before: EventComparable, after: EventComparable): boolean {
  return (
    before.title !== after.title ||
    before.description !== after.description ||
    before.startsAt !== after.startsAt ||
    before.venue !== after.venue ||
    before.status !== after.status
  )
}
