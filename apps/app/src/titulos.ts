import { tituloDaRota } from "@/lib/navegacao/rotas"

/**
 * Enquanto a onda 1c não traz o estado da cidade, o título que depende dela
 * (Guia de {cidade}) usa a cidade-piloto documentada no AGENTS.md — Manaus é
 * exemplo, não limite de acesso.
 */
export const CIDADE_DE_PROVA = "Manaus"

export function tituloDaTela(nome: string): string {
  return tituloDaRota(nome, CIDADE_DE_PROVA)
}
