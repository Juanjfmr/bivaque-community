// A régua da resposta a um pedido de indicação, num módulo só.
//
// Os limites são os mesmos de sempre: o CHECK de `recommendation_replies`
// (migration 20260802001100, 5..2000). A tela antiga de indicação saiu em
// 18/11 (troca para /app/pergunta/:id); a rota do app é quem usa este módulo.

export const REPLY_MIN = 5
export const REPLY_MAX = 2000

/** O texto aparado que veio no corpo, ou `null` quando não é string. */
export function replyTextFromBody(valor: unknown): string | null {
  return typeof valor === "string" ? valor.trim() : null
}

/** O motivo para a pessoa, ou `null` quando dá para gravar. */
export function validateReply(texto: string): string | null {
  if (texto.length < REPLY_MIN) {
    return `Escreva uma resposta com pelo menos ${REPLY_MIN} caracteres.`
  }
  if (texto.length > REPLY_MAX) {
    return `Encurte a resposta para até ${REPLY_MAX} caracteres.`
  }
  return null
}
