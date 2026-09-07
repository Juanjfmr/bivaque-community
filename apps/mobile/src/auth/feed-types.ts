// Tipos compartilhados entre client.ts, publish.ts, reactions.ts e a UI.
// Separados em arquivo proprio para evitar ciclo de imports.

export interface PostRow {
  id: string
  content: string
  created_at: string
  user_id: string
  community_id: string | null
  locality_id: string | null
  group_id: string | null
  profiles: { display_name: string } | null
  reactions_count: { count: number }[] | null
}

export interface CommunityOption {
  id: string
  name: string
}
