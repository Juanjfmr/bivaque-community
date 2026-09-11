// RECON-029 (R35 / prancha 48+): validação e payload do criar/editar evento.
//
// Puro e sem import de servidor, para ser testado diretamente. O escopo
// (localidade/comunidade/grupo) NUNCA entra no payload de edição — editar não
// muda alcance, que é a proibição da cláusula R35.

export const EVENT_TITLE_MAX = 200
export const EVENT_DESCRIPTION_MAX = 2000
export const EVENT_VENUE_MAX = 200

export type EventFormInput = {
  title: string
  description: string
  startsAt: string
  venue: string
}

export type EventPayload = {
  title: string
  description: string | null
  starts_at: string
  venue: string | null
}

/** Devolve a mensagem de erro, ou null quando o formulário está válido. */
export function validateEventForm(input: EventFormInput): string | null {
  const title = input.title.trim()
  if (title.length < 2) return "O título precisa de pelo menos 2 caracteres."
  if (title.length > EVENT_TITLE_MAX) {
    return `O título pode ter no máximo ${EVENT_TITLE_MAX} caracteres.`
  }
  if (input.description.trim().length > EVENT_DESCRIPTION_MAX) {
    return `A descrição pode ter no máximo ${EVENT_DESCRIPTION_MAX} caracteres.`
  }
  if (input.venue.trim().length > EVENT_VENUE_MAX) {
    return `O local pode ter no máximo ${EVENT_VENUE_MAX} caracteres.`
  }
  if (!input.startsAt) return "Informe a data e a hora do evento."
  const start = new Date(input.startsAt)
  if (Number.isNaN(start.getTime())) return "Data e hora inválidas."
  return null
}

export function buildEventPayload(input: EventFormInput): EventPayload {
  return {
    title: input.title.trim(),
    description: input.description.trim() ? input.description.trim() : null,
    starts_at: new Date(input.startsAt).toISOString(),
    venue: input.venue.trim() ? input.venue.trim() : null,
  }
}

export type EventCreatePayload = EventPayload & {
  organizer_id: string
  locality_id: string
}

/**
 * Payload de criação: a localidade vem do contexto e o organizador é a sessão.
 * O escopo é fixado aqui e não muda depois — a edição usa `buildEventPayload`,
 * que não carrega nenhum campo de alcance.
 */
export function buildEventCreatePayload(
  input: EventFormInput,
  context: { organizerId: string; localityId: string },
): EventCreatePayload {
  return {
    ...buildEventPayload(input),
    organizer_id: context.organizerId,
    locality_id: context.localityId,
  }
}
