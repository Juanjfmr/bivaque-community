// Builder puro do payload de publicacao.
//
// Existe em arquivo proprio para que o teste (publish-builder.test.ts)
// possa importar sem puxar a cadeia expo-secure-store -> react-native
// que quebra o parser do rolldown/vite em ambiente Node. Toda a logica
// pura que nao precisa do cliente supabase vive aqui.

export type Audience = "village" | "city"

export interface PublishInput {
  authorId: string
  content: string
  audience: Audience
  communityId: string | null
  localityId: string | null
}

export function buildPostInsert(input: PublishInput): {
  user_id: string
  content: string
  community_id: string | null
  locality_id: string | null
  is_deleted: false
} {
  const localityId = input.audience === "city" ? input.localityId : null
  const communityId = input.audience === "village" ? input.communityId : null
  return {
    user_id: input.authorId,
    content: input.content,
    community_id: communityId,
    locality_id: localityId,
    is_deleted: false,
  }
}
