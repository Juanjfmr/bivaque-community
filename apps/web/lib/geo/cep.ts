/**
 * O CEP do perfil (RUN-029 / ADR-20261022-localizacao).
 *
 * O banco guarda os oito dígitos; a tela e a API mostram `00000-000`. Normalizar
 * aqui é só forma: se o CEP existe é o geocodificador do servidor que decide.
 */

/** Os oito dígitos, ou `null` quando não é um CEP. */
export function normalizarCep(entrada: string): string | null {
  const digitos = entrada.replace(/[^0-9]/g, "")
  return digitos.length === 8 ? digitos : null
}

/** `12345678` -> `12345-678`. Recebe o que já está normalizado. */
export function formatarCep(digitos: string): string {
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`
}
