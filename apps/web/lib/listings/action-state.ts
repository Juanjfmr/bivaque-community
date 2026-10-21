export interface ActionState {
  ok: boolean
  field?: string
  message?: string
  /** Id do recurso criado/atualizado quando a tela precisa enviar fotos depois. */
  listingId?: string
}
