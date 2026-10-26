/** Somente estado demonstrativo da aba: não altera vínculos ou solicitações reais. */
export type EstadoDoGrupo = "fora" | "pendente" | "membro"
function chave(cidade: string, id: string, tipo: "estado" | "rascunhos"): string {
  return `bivaque:grupo-previa:${cidade.trim().toLowerCase()}:${id}:${tipo}`
}
export function lerEstadoLocal(cidade: string, id: string): EstadoDoGrupo | null {
  try {
    const valor = sessionStorage.getItem(chave(cidade, id, "estado"))
    return valor === "fora" || valor === "pendente" || valor === "membro" ? valor : null
  } catch {
    return null
  }
}
export function guardarEstadoLocal(cidade: string, id: string, estado: EstadoDoGrupo): boolean {
  try {
    sessionStorage.setItem(chave(cidade, id, "estado"), estado)
    return true
  } catch {
    return false
  }
}
export function lerRascunhosDoGrupo(cidade: string, id: string): string[] {
  try {
    const valor: unknown = JSON.parse(sessionStorage.getItem(chave(cidade, id, "rascunhos")) ?? "[]")
    return Array.isArray(valor) ? valor.filter((item): item is string => typeof item === "string").slice(0, 10) : []
  } catch {
    return []
  }
}
export function guardarRascunhoDoGrupo(cidade: string, id: string, texto: string): string[] | null {
  const limpa = texto.trim()
  if (limpa.length < 10 || limpa.length > 2000) return null
  try {
    const resultado = [limpa, ...lerRascunhosDoGrupo(cidade, id)].slice(0, 10)
    sessionStorage.setItem(chave(cidade, id, "rascunhos"), JSON.stringify(resultado))
    return resultado
  } catch {
    return null
  }
}
export function excluirRascunhoDoGrupo(cidade: string, id: string, indice: number): string[] | null {
  try {
    const atual = lerRascunhosDoGrupo(cidade, id)
    if (!Number.isInteger(indice) || indice < 0 || indice >= atual.length) return null
    const resultado = atual.filter((_, i) => i !== indice)
    sessionStorage.setItem(chave(cidade, id, "rascunhos"), JSON.stringify(resultado))
    return resultado
  } catch {
    return null
  }
}
