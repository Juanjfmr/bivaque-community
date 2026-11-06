/** Rascunho desta aba; armazenamento indisponível nunca apaga o texto em memória. */
// shortcut: um rascunho por tipo e cidade nesta aba; ampliar quando for necessário manter vários em edição.
export function lerRascunho<T extends Record<string, string>>(chave: string, inicial: T): T {
  try {
    const bruto: unknown = JSON.parse(sessionStorage.getItem(chave) ?? "null")
    if (!bruto || typeof bruto !== "object") return inicial
    const salvo = bruto as Record<string, unknown>
    if (Object.keys(inicial).every((campo) => typeof salvo[campo] === "string")) return salvo as T
  } catch {
    /* A pessoa ainda pode preencher e publicar. */
  }
  return inicial
}

export function guardarRascunho(chave: string, dados: Record<string, string>): boolean {
  try {
    sessionStorage.setItem(chave, JSON.stringify(dados))
    return true
  } catch {
    return false
  }
}

export function excluirRascunho(chave: string): void {
  try {
    sessionStorage.removeItem(chave)
  } catch {
    /* A publicação já foi confirmada. */
  }
}
