/**
 * Identificador local, do protótipo (`utilities/format.js`: `uid`).
 *
 * O inventário §7 registra esta linha como "talvez": quando o banco passa a
 * gerar o id, a função sai. Enquanto a onda 1c não tem banco, ela continua
 * sendo o id dos itens de prova e da pilha de avisos.
 */
export function idLocal(prefixo: string): string {
  const aleatorio = globalThis.crypto
  if (aleatorio && typeof aleatorio.randomUUID === "function") {
    return `${prefixo}${aleatorio.randomUUID().replaceAll("-", "").slice(0, 12)}`
  }
  return `${prefixo}${Math.random().toString(36).slice(2, 14)}`
}
