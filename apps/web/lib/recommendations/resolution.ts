// RECON-035 — leitura da marca "resposta que resolveu".
//
// A marca é um ponteiro dentro da conversa (ADR-20260909-resposta-que-resolveu,
// D5): não é reputação, ranking nem selo de perfil. Desde 25/09/2026 ela
// alimenta a busca de indicações (ADR-20260925-memoria-de-indicacoes, D2), no
// banco. Este módulo só decide, para um pedido e uma resposta, qual é o estado
// de leitura — nada de agregar ou pontuar.

export interface ResolutionView {
  is_resolved: boolean
  resolved_reply_id: string | null
}

export type ReplyResolution = "marked" | "resolved_without_reply" | "open"

/**
 * Estado da resposta na conversa:
 * - "marked": é a resposta que a autora escolheu (destaque + chip);
 * - "resolved_without_reply": a pergunta foi resolvida sem marcar resposta;
 * - "open": a pergunta ainda não foi resolvida.
 */
export function replyResolution(view: ResolutionView, replyId: string): ReplyResolution {
  if (view.resolved_reply_id === replyId) {
    return "marked"
  }
  return view.is_resolved ? "resolved_without_reply" : "open"
}

/** Só a autora da pergunta marca, limpa ou reabre (ADR D2). */
export function canResolveRequest(view: { author_id: string }, userId: string): boolean {
  return view.author_id === userId
}
