// RECON-009 — partição pura da comunidade da prancha 43 (rota /communities/[id]).
//
// Sem React e sem Supabase aqui: a página-servidor achata as linhas e o island
// cliente só renderiza. É neste módulo que mora a regra que o contrato cobra:
// pedido pendente NÃO é membresia, visitante NÃO vê contagem nem roster, e o
// acesso a cada grupo vem da visibilidade real + da própria linha de
// participação consultada — nunca de um número exibido em tela.

// `outsider` entrou com a decisão do dono de 15/09/2026 (nome e estado da
// comunidade não são sigilosos): é quem vê a apresentação sem ser da cidade e,
// por isso, não recebe o corpo de pedido de entrada.
export type CommunityAudience = "member" | "pending" | "visitor" | "outsider"

export type MembershipLite = {
  role: "member" | "moderator" | "owner"
  status: "pending" | "approved"
}

/** Os três públicos da tela, resolvidos da SUA linha de participação. */
export function resolveAudience(membership: MembershipLite | null): CommunityAudience {
  if (membership?.status === "approved") return "member"
  if (membership?.status === "pending") return "pending"
  return "visitor"
}

export type GroupRowLite = {
  id: string
  name: string
  description: string | null
  /** Coluna `visibility` real de `groups` — não se deduz de contagem. */
  visibility: "public" | "private"
}

export type MyGroupMembershipLite = {
  group_id: string
  status: "pending" | "approved"
}

/**
 * Grupos cujo conteúdo a permissão real libera para esta pessoa: públicos são
 * abertos a qualquer membro da comunidade; privados só com linha própria
 * aprovada legível. Essa é a lista que decide o que se consulta em seguida —
 * critério consultado, não número em tela.
 */
export function enterableGroupIds(
  groups: GroupRowLite[],
  myMemberships: MyGroupMembershipLite[],
): string[] {
  const approved = new Set(
    myMemberships.filter((m) => m.status === "approved").map((m) => m.group_id),
  )
  return groups.filter((g) => g.visibility === "public" || approved.has(g.id)).map((g) => g.id)
}

export type GroupCard = {
  id: string
  name: string
  description: string | null
  visibility: "public" | "private"
  /** Posso abrir/participar do grupo — permissão consultada, não inferida. */
  canEnter: boolean
  /** Tenho linha própria aprovada neste grupo (lida de `group_memberships`). */
  participating: boolean
  /**
   * `null` = a RLS não libera a lista completa deste grupo para este público
   * (privado sem participação aprovada): a contagem não aparece e não é
   * carregada — esconder no cliente não seria suficiente.
   */
  memberCount: number | null
}

export function buildGroupCards(
  groups: GroupRowLite[],
  myMemberships: MyGroupMembershipLite[],
  approvedCountByGroupId: ReadonlyMap<string, number>,
): GroupCard[] {
  const enterable = new Set(enterableGroupIds(groups, myMemberships))
  const participating = new Set(
    myMemberships.filter((m) => m.status === "approved").map((m) => m.group_id),
  )
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    visibility: group.visibility,
    canEnter: enterable.has(group.id),
    participating: participating.has(group.id),
    // Dentro da lista enterável a leitura das linhas aprovadas foi completa
    // (pública para qualquer membro de localidade; privada só para quem já
    // participa). Ausência de linha aqui é zero real, não falha escondida.
    memberCount: enterable.has(group.id) ? (approvedCountByGroupId.get(group.id) ?? 0) : null,
  }))
}

/** UUID canônico — rota com id malformado é 404 honesto, não erro de consulta. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

/** "15 de março de 2023" a partir de `created_at` real — "" se inválida. */
export function formatCreatedOn(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/** "8 de set." a partir de `joined_at` real do próprio pedido — nunca chumbada. */
export function formatRequestedOn(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(/\.$/, "")
}
