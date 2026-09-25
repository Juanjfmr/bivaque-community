// Veredito mecânico de uma captura no comparador (compare.mjs). Falha FECHADA:
// só uma prova explícita de estado/rota (`proof.valid === true`) deixa a
// captura concorrer a "mecanicamente ok". Captura sem prova nenhuma — antiga,
// de outro cenário, gravada antes de a prova existir — não é evidência.
//
// "mecanicamente ok" continua NÃO sendo fidelidade: é só ausência de achado
// automático numa captura cuja rota e estado foram provados.

/** @param {{ proof?: { valid?: boolean } | null, data?: { total?: number, high?: number } }} dado */
export function captureVerdict(dado) {
  const proofValid = dado?.proof?.valid
  if (proofValid === false) return { kind: "invalid", label: "captura inválida" }
  if (proofValid !== true) return { kind: "unproven", label: "sem prova" }
  const high = dado?.data?.high ?? 0
  const total = dado?.data?.total ?? 0
  if (high > 0) return { kind: "high", label: `${high} high` }
  if (total > 0) return { kind: "findings", label: String(total) }
  return { kind: "ok", label: "mecanicamente ok" }
}
