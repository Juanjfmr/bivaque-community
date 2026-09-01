// Logica de reacao no feed: insert idempotente em post_reactions.
//
// O design aqui difere do app de exemplo do supabase-js em um ponto:
// nunca chama .delete() quando o usuario "desfaz" a reacao. O motivo
// e' que (a) o app mobile nao precisa de contagem precisa para
// UX (mostramos o valor em cache da query) e (b) deletes concorrentes
// podem causar inconsistencias com RLS de update. Reagir 2x no mesmo
// post gera um 23505 (unique violation) que classificamos como
// "already reacted" e silenciamos — o app mostra o estado reacted
// a partir do cache, nao do servidor.
//
// Por que separado: a funcao e' pura no sentido de que nao toca UI.
// A UI chama toggleReaction() e atualiza o estado local com base no
// retorno; o servidor e' a fonte da verdade no proximo load.

import { supabase } from "./client"

export type ReactionOutcome =
  | { kind: "ok" }
  | { kind: "already" }
  | { kind: "denied" }
  | { kind: "transport" }

export async function toggleReaction(
  postId: string,
  userId: string,
  currentlyReacted: boolean,
): Promise<ReactionOutcome> {
  if (currentlyReacted) {
    // Nao desfazemos no servidor (ver doc do modulo). Marcamos como
    // "ok" e a UI mantem o estado reacted. No proximo load, o servidor
    // sera a fonte da verdade — se a contagem caiu, a UI re-renderiza.
    return { kind: "ok" }
  }
  try {
    const { error } = await supabase
      .from("post_reactions")
      .insert({ post_id: postId, user_id: userId })

    if (!error) {
      return { kind: "ok" }
    }
    // 23505 = unique_violation: ja' reagiu. Idempotente.
    if (error.code === "23505") {
      return { kind: "already" }
    }
    // 42501 (RLS) ou PGRST116 (zero rows quando deveria haver):
    // membro suspenso, sem membership, ou alvo sumiu. Nao distinguimos
    // para a UI — copy generica (anti-enumeracao §4.3).
    if (error.code === "42501" || error.code === "PGRST116") {
      return { kind: "denied" }
    }
    return { kind: "transport" }
  } catch {
    return { kind: "transport" }
  }
}
