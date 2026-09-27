// Mudar a cidade do membro pelo perfil (25/09/2026, decisão do dono): a troca
// usa o mecanismo de transferência que já existe no banco
// (`declare_locality_transfer`, ADR-20260816-transferencia-e-pertencimento). A
// cidade atual vira "de saída" até a data informada — até lá a pessoa ainda lê
// e publica nela — e a nova vira a atual.
//
// Só cidade. Endereço residencial nunca é pedido nem guardado (AGENTS.md).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 24 * 60 * 60 * 1000

/** Padrão do prazo na cidade de saída: o mesmo do provisionamento (30 dias). */
export const DEFAULT_TERM_DAYS = 30
/** Teto do prazo: mais que isso não é mudança, é ter duas cidades. */
export const MAX_TERM_DAYS = 180

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function defaultTermDate(today: Date): string {
  return toIsoDate(new Date(today.getTime() + DEFAULT_TERM_DAYS * DAY_MS))
}

export function maxTermDate(today: Date): string {
  return toIsoDate(new Date(today.getTime() + MAX_TERM_DAYS * DAY_MS))
}

/** Erro de validação legível, ou null quando o pedido pode ir ao banco. */
export function validateMove(
  input: { destinationId: string; currentId: string; termDate: string },
  today: Date,
): string | null {
  if (!UUID.test(input.destinationId)) return "Escolha a cidade para onde você vai."
  if (input.destinationId === input.currentId) return "Essa já é a sua cidade."
  if (!ISO_DATE.test(input.termDate) || Number.isNaN(Date.parse(input.termDate))) {
    return "Informe até quando você fica na cidade atual."
  }
  const todayIso = toIsoDate(today)
  if (input.termDate < todayIso) return "A data não pode estar no passado."
  if (input.termDate > maxTermDate(today)) {
    return `O prazo máximo é de ${MAX_TERM_DAYS} dias a partir de hoje.`
  }
  return null
}

/**
 * O texto cru do Postgres não é mensagem de pessoa. `23514` cobre os recusos
 * de regra da função (destino fora do catálogo, igual à atual); `23505` é o
 * índice que proíbe duas cidades de saída ao mesmo tempo, ou voltar para a
 * cidade de onde a pessoa ainda está saindo.
 */
export function moveErrorMessage(error: { code?: string }): string {
  if (error.code === "23505") {
    return "Você já tem uma mudança em andamento. Espere o prazo da cidade anterior terminar para mudar de novo."
  }
  if (error.code === "23514") {
    return "Não foi possível mudar para essa cidade. Escolha outra cidade da lista."
  }
  if (error.code === "28000" || error.code === "42501") {
    return "Sua sessão expirou. Entre novamente para continuar."
  }
  return "Não foi possível mudar a sua cidade agora. Tente novamente."
}
