// DS-006 — o chip de alcance do pedido de indicação.
//
// O chip fala do PEDIDO, não de quem lê. Usar a cidade da sessão rotulava um
// pedido de outra localidade com a cidade errada — e a localidade do pedido já
// vem no próprio SELECT (`recommendation_requests.locality_id`).
//
// A função é pura de propósito: o caso "outra cidade" não tem fixture no seed,
// então ele precisa ser verificável sem navegador.

export interface LocalityScopeInput {
  /** Pedido escopado a um grupo: o alcance é o grupo, não a cidade. */
  groupId: string | null
  /** `recommendation_requests.locality_id` (null quando o alcance é um grupo). */
  localityId: string | null
  currentId: string
  currentCityName: string
  /** Destino de mudança declarado, quando existe: o único outro nome em mãos. */
  outbound: { id: string; cityName: string } | null
}

export function localityScopeLabel({
  groupId,
  localityId,
  currentId,
  currentCityName,
  outbound,
}: LocalityScopeInput): string {
  if (groupId !== null) return "Grupo"
  if (localityId === currentId) return currentCityName
  if (outbound !== null && localityId === outbound.id) return outbound.cityName
  // Nome desconhecido: rotula o alcance sem afirmar a cidade errada.
  return "Outra cidade"
}
