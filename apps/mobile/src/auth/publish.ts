// Logica pura de publicacao para o mobile.
//
// Por que separado de community.tsx: torna o caminho de escrita
// testavel sem UI / sem rede, e mantem a fronteira onde o orquestrador
// ou outro agente pode trocar implementacao (no futuro, uma fila
// offline via expo-task-manager) sem mexer em quem chama.

import { supabase } from "./client"
import type { PostRow } from "./feed-types"
import { buildPostInsert, type PublishInput } from "./publish-builder"
import { classifyPublishError } from "./publish-error"

// Re-export do tipo para que callers continuem importando de ./publish
// (mantem a API estavel).
export type { Audience, PublishInput } from "./publish-builder"

export interface PublishOk {
  kind: "ok"
  post: PostRow
}

export interface PublishErr {
  kind: "err"
  view: ReturnType<typeof classifyPublishError>
}

export type PublishResult = PublishOk | PublishErr

export async function publishPost(input: PublishInput): Promise<PublishResult> {
  try {
    const body = buildPostInsert(input)
    const { data, error } = await supabase
      .from("posts")
      .insert(body)
      .select(
        "id, content, created_at, user_id, community_id, locality_id, group_id, profiles!posts_user_id_fkey(display_name), reactions_count:post_reactions(count)",
      )
      .single()

    if (error) {
      return { kind: "err", view: classifyPublishError(error) }
    }
    return { kind: "ok", post: data as unknown as PostRow }
  } catch (error) {
    return { kind: "err", view: classifyPublishError(error) }
  }
}
