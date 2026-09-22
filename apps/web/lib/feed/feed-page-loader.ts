// FEED-PAGINACAO-CURSOR — rodada 2 (TELA): a leitura de UMA página.
//
// Um só caminho de leitura para os três chamadores do feed da comunidade
// (`(shell)/inicio`, `(shell)/community` e `(shell)/communities/[id]`). Antes
// desta rodada cada um chamava `feed_community` sem limite e recebia a base
// inteira; agora cada um pede UMA página, e a página seguinte só sai daqui
// quando a pessoa pede.
//
// Contratos que vêm da rodada 1 e são respeitados aqui:
//   - o cursor é o PAR `created_at` + `id` e anda junto: sem cursor, os dois
//     parâmetros NÃO VÃO na requisição (o servidor monta a primeira página com
//     os defaults dele). Meio cursor é recusado pela função — de propósito;
//   - `p_limit` é pedido do cliente e TETO do servidor: acima de 50 a função
//     corta. A tela pede `FEED_PAGE_SIZE`, nunca "tudo";
//   - mudou QUANTO se lê, nunca QUEM pode ler: a autorização continua dentro da
//     função (`security definer`, checagem `am_member`, visibilidade de grupo
//     privado). Nenhum filtro de visibilidade é refeito no cliente.
//
// O loader NÃO rejeita, no padrão dos loaders da casa: falha de rede ou erro da
// função viram estado recuperável com mensagem em português, nunca uma Promise
// rejeitada solta nem uma lista vazia fingida.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import {
  FEED_PAGE_SIZE,
  type FeedCursor,
  type FeedOrder,
  feedOrderPaginates,
} from "./feed-pagination"

type FeedClient = SupabaseClient<Database>

export const FEED_PAGE_ERROR_MESSAGE = "Não foi possível carregar as publicações. Tente novamente."

export type FeedPageRow = Database["public"]["Functions"]["feed_community"]["Returns"][number]

export type FeedPageOutcome =
  | { status: "ok"; posts: FeedPageRow[] }
  | { status: "error"; message: string }

export interface FeedPageRequest {
  communityId: string
  order?: FeedOrder
  /** Cursor da última linha já na tela. `null`/ausente = primeira página. */
  cursor?: FeedCursor | null
  limit?: number
}

export async function loadFeedPage(
  client: FeedClient,
  request: FeedPageRequest,
): Promise<FeedPageOutcome> {
  const { communityId, order = "recent", limit = FEED_PAGE_SIZE } = request
  // `Relevantes` é lista limitada: mesmo que alguém passe um cursor, ele não é
  // enviado — a lista não tem "próxima página" para pedir.
  const cursor = feedOrderPaginates(order) ? (request.cursor ?? null) : null

  try {
    const args: Database["public"]["Functions"]["feed_community"]["Args"] = {
      p_community_id: communityId,
      p_order: order,
      p_limit: limit,
    }
    if (cursor !== null) {
      args.p_before_created_at = cursor.createdAt
      args.p_before_id = cursor.id
    }

    const { data, error } = await client.rpc("feed_community", args)

    if (error) {
      return { status: "error", message: FEED_PAGE_ERROR_MESSAGE }
    }

    return { status: "ok", posts: (data as FeedPageRow[] | null) ?? [] }
  } catch {
    // Rejeição de rede (pilha fora do ar, offline) é erro recuperável na seção —
    // nunca carregamento infinito nem lista vazia no lugar de uma consulta que
    // falhou.
    return { status: "error", message: FEED_PAGE_ERROR_MESSAGE }
  }
}
