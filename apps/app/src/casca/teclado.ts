export function emComposicao(evento: Pick<KeyboardEvent, "isComposing" | "keyCode">): boolean {
  return evento.isComposing || evento.keyCode === 229
}
