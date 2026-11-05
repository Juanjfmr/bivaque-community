/**
 * A régua da presença no encontro, pura e sem servidor.
 *
 * O valor aceito é fixo no enum do banco (`event_rsvp_status`) e quem decide se
 * a pessoa PODE confirmar é a RLS (`private.can_access_event`), não esta função.
 * Aqui só se recusa o que nem chega a ser consultado — o mesmo caminho para a
 * rota do app e para a ação antiga.
 */
export const SITUACOES_DE_PRESENCA = ["going", "not_going", "interested"] as const

export type SituacaoDePresenca = (typeof SITUACOES_DE_PRESENCA)[number]

export function ehSituacaoDePresenca(valor: unknown): valor is SituacaoDePresenca {
  return typeof valor === "string" && (SITUACOES_DE_PRESENCA as readonly string[]).includes(valor)
}

/** A situação vinda do corpo, ou `null` quando o valor não é um dos aceitos. */
export function situacaoDoCorpo(corpo: Record<string, unknown>): SituacaoDePresenca | null {
  const situacao = corpo["situacao"]
  return ehSituacaoDePresenca(situacao) ? situacao : null
}
