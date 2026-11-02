import { tituloDaRota } from "@/lib/navegacao/rotas"

/**
 * O título da tela, com a cidade que a casca está vendo.
 *
 * Sem cidade (fora do provedor, como num unitário), cai na cidade-piloto
 * documentada no AGENTS.md — Manaus é exemplo, não limite de acesso.
 */
export const CIDADE_DE_PROVA = "Manaus"

export function tituloDaTela(nome: string, cidade: string = CIDADE_DE_PROVA): string {
  return tituloDaRota(nome, cidade)
}
