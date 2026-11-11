/**
 * A leitura de um parâmetro de texto da URL, compartilhada pelas telas que
 * recebem o endereço (LAN-F06 no Mercado, LAN-TROCA na Busca).
 *
 * Lógica pura, sem roteador: quem lê a busca do endereço entrega o registro e
 * recebe o texto já aparado. Valor torto vira `null` — nunca a string `"null"`
 * nem uma mensagem de erro para a pessoa.
 */
export function texto(valor: unknown): string | null {
  if (typeof valor === "string" && valor.trim() !== "") return valor.trim()
  if (typeof valor === "number" && Number.isFinite(valor)) return String(valor)
  return null
}

/**
 * Patch de busca para o roteador: `null` remove a chave do endereço (valor
 * voltando ao padrão sai da URL) e o resto é mesclado com o que já está lá.
 */
export function mesclarNaUrl(
  atual: Record<string, unknown>,
  valores: Record<string, string | number | null>,
): Record<string, unknown> {
  const saida: Record<string, unknown> = { ...atual }
  for (const [chave, valor] of Object.entries(valores)) {
    if (valor === null) delete saida[chave]
    else saida[chave] = valor
  }
  return saida
}
