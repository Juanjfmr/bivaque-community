/**
 * "Denunciar" no perfil de um membro com quem já há conversa (rodada 3, M2):
 * o perfil não tem rota para denunciar a pessoa em si, então leva à conversa
 * e pede que ela abra a folha de denúncia da última mensagem recebida. O
 * pedido vale uma vez, só para aquela conversa, e não sobrevive a recarregar.
 */
let pedida: string | null = null

export function pedirDenuncia(conversaId: string): void {
  pedida = conversaId
}

/** Devolve `true` uma única vez para a conversa pedida e esquece o pedido. */
export function tomarDenunciaPedida(conversaId: string): boolean {
  if (pedida !== conversaId) return false
  pedida = null
  return true
}
