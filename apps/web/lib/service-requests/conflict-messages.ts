// Frases de conflito do encerramento/cancelamento de pedido. Ficam fora de
// pedidos/[id]/actions.ts porque um arquivo "use server" só pode exportar
// funções assíncronas.
//
// Quem lê estas frases é quem pediu (a tela /pedidos/[id]); o cancelamento pode
// ter sido feito pela própria pessoa em outra aba, então a frase não atribui
// autoria.
export const CLOSE_CONFLICT_CANCELLED = "Este pedido já foi cancelado."
export const CANCEL_CONFLICT_FINISHED =
  "Este pedido já foi encerrado e não pode mais ser cancelado."
