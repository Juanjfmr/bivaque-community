// A régua da resposta a um pedido de indicação, num módulo só.
//
// Os limites são os mesmos de sempre: o CHECK de `recommendation_replies`
// (migration 20260802001100, 5..2000) e a tela antiga
// (`app/components/indications/indication-detail.tsx`, REPLY_MIN/REPLY_MAX). A
// rota do app e a tela antiga não podem discordar sobre o que é uma resposta
// válida; a cópia que sobra é a da tela, que ainda não usa este módulo.

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
