/**
 * As buscas recentes da tela de busca (estado de primeira entrada do parecer
 * cego de 12/11).
 *
 * Só existe registro real: a lista nasce do termo que a pessoa enviou da tela
 * inicial ou escolheu aqui, e é guardada no próprio aparelho. Sem registro, a
 * tela não mostra a seção — nunca uma sugestão de "recente" que ninguém fez.
 *
 * O armazenamento é passado por parâmetro para o teste provar leitura, escrita,
 * limite, repetição e aparelho sem `localStorage` (modo privado).
 */

const CHAVE = "bivaque:buscas-recentes"

/** O que a tela mostra: cinco é o que cabe sem empurrar o que existe na cidade. */
export const LIMITE_DE_RECENTES = 5

function padrao(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage
}

function mesmoTermo(a: string, b: string): boolean {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" }) === 0
}

/** Do mais recente para o mais antigo; lixo no armazenamento vira lista vazia. */
export function lerRecentes(armazenamento: Storage | null = padrao()): string[] {
  if (armazenamento === null) return []
  try {
    const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE) ?? "[]")
    if (!Array.isArray(bruto)) return []
    return bruto
      .filter((termo): termo is string => typeof termo === "string" && termo.trim() !== "")
      .slice(0, LIMITE_DE_RECENTES)
  } catch {
    return []
  }
}

/** Grava o termo no topo, sem repetir e sem passar do limite. */
export function registrarRecente(
  termo: string,
  armazenamento: Storage | null = padrao(),
): string[] {
  const limpo = termo.trim()
  if (limpo === "" || armazenamento === null) return lerRecentes(armazenamento)
  const proximos = [
    limpo,
    ...lerRecentes(armazenamento).filter((antigo) => !mesmoTermo(antigo, limpo)),
  ].slice(0, LIMITE_DE_RECENTES)
  try {
    armazenamento.setItem(CHAVE, JSON.stringify(proximos))
  } catch {
    // Aparelho sem espaço (ou sem permissão) não perde a busca: só não lembra.
  }
  return proximos
}
