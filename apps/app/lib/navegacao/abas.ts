import { type Aba, rotaPorNome, SUBABAS_DO_MERCADO, type SubAbaDoMercado } from "./rotas"

/**
 * A aba que a tela acende (ADR §3.2).
 *
 * Toda tela com dono acende só a aba dela; a regra de origem por entrada vale
 * apenas para o que ainda tem mais de uma porta (Salvos, Meus anúncios, a busca
 * e os destinos de notificação). Conversas não acende aba nenhuma: é o ícone do
 * topo.
 */
export function abaAtiva(nome: string, origem: Aba): Aba | null {
  const rota = rotaPorNome(nome)
  if (!rota) return origem
  switch (rota.dono) {
    case "sem-aba":
      return null
    case "origem":
      return origem
    default:
      return rota.dono
  }
}

/** A sub-aba do Mercado que a rota representa. */
export function subAbaDoMercado(nome: string): SubAbaDoMercado | null {
  if (nome === "catalogo" || nome === "mercado") return "desapegos"
  return (SUBABAS_DO_MERCADO as readonly string[]).includes(nome) ? (nome as SubAbaDoMercado) : null
}
