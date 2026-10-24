// As rotas antigas das vilas (ADR-20261023-comunidade-do-prototipo, seção
// "Navegação e estrutura": "vila não existe nesta versão do produto"). O código
// das vilas sai da tela, mas nada é apagado no banco: as tabelas seguem no
// schema até um ADR de remoção, e os endereços antigos continuam existindo só
// para levar quem chega por um link salvo à Comunidade da cidade.
//
// A lista é FECHADA e vive no código. O destino é sempre /community, nunca lido
// da URL — um `redirect` que aceitasse um caminho vindo da query seria um open
// redirect. `vilaRedirectFor` recusa qualquer caminho fora desta lista.

import type { Route } from "next"

/** A Comunidade da cidade — o único destino das rotas de vila. */
export const COMMUNITY_HREF: Route = "/community"

/**
 * Caminhos de rota antigos das vilas, na forma de pasta do App Router (com
 * `[id]` para o segmento dinâmico). A ordem agrupa o shell do membro e o
 * console.
 */
export const VILA_LEGACY_PATHS = [
  "/communities",
  "/communities/[id]",
  "/communities/[id]/invite",
  "/communities/[id]/indicar-prestador",
  "/communities/[id]/admin",
  "/communities/[id]/admin/media",
  "/communities/[id]/admin/moderators",
  "/communities/[id]/admin/pending",
  "/communities/[id]/admin/providers",
  // O aceite do convite de vila ("Peça um novo ao dono da vila") é vila: o ADR
  // move o convite para o grupo (lote 5 B), então o endereço antigo também leva
  // à Comunidade da cidade. Só o aceite sai da tela; a RPC e o pgTAP do convite
  // continuam no banco.
  "/invite/[token]",
] as const

export type VilaLegacyPath = (typeof VILA_LEGACY_PATHS)[number]

const VILA_LEGACY_SET: ReadonlySet<string> = new Set(VILA_LEGACY_PATHS)

/**
 * O destino de uma rota de vila, para o `redirect()` do Next. Recebe o caminho
 * ESTÁTICO do próprio arquivo de rota (nunca a URL) e só responde para a lista
 * fechada acima; qualquer outro valor lança. O retorno é sempre `/community`.
 */
export function vilaRedirectFor(staticPath: string): Route {
  if (!VILA_LEGACY_SET.has(staticPath)) {
    throw new Error(
      `vilaRedirectFor só aceita um caminho da lista fechada de vilas; recebeu "${staticPath}".`,
    )
  }
  return COMMUNITY_HREF
}
