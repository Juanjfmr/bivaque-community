// Nome de exibição — a regra da edição do perfil que a web antiga aplicava
// (`(shell)/profile/editar/page.tsx`: 2 a 80 caracteres, espaços colapsados).
// A tela valida para responder rápido; o CHECK de `profiles.display_name` é a
// fronteira real. Extraído da tela para a rota do app chamar a MESMA regra.

export const NOME_MIN_LENGTH = 2
export const NOME_MAX_LENGTH = 80

export function normalizarNome(bruto: string): string {
  return bruto.trim().replace(/\s+/g, " ")
}

/** `null` quando o nome é aceitável; a mensagem pronta quando não é. */
export function validarNome(bruto: string): string | null {
  const nome = normalizarNome(bruto)
  if (nome.length < NOME_MIN_LENGTH) return "O nome deve ter ao menos 2 caracteres."
  if (nome.length > NOME_MAX_LENGTH) return "Use até 80 caracteres no nome."
  return null
}
