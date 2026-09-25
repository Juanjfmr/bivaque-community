// Chave de repetição segura de uma mensagem. O servidor deduplica por
// (conversa, remetente, chave): reenviar a MESMA mensagem com a mesma chave
// devolve a linha já gravada. Mas a chave pertence ao TEXTO que foi enviado com
// ela. Se a pessoa edita o texto depois de uma tentativa, reusar a chave faria
// o servidor devolver a mensagem antiga em silêncio — o texto novo sumiria.

export function newClientKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** `lastSubmitted`: o texto da última tentativa com a chave atual, ou null
 *  quando a chave ainda não foi usada. */
export function shouldRotateClientKey(lastSubmitted: string | null, next: string): boolean {
  if (lastSubmitted === null) return false
  return next.trim() !== lastSubmitted.trim()
}
