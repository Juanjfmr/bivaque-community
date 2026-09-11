// RECON-004 — partição pura da tela de comunidades (prancha 42).
//
// Sem React e sem Supabase aqui: a página-servidor achata as linhas em
// `CommunityCard`/`MyMembership` e o client island só renderiza. Manter a
// separação "minhas / descobrir / pedidos" como função pura é o que permite
// auditar a regra longe do JSX — é ela que decide que pedido pendente NÃO é
// membresia e que a descoberta respeita a cidade selecionada.

export type CommunityCard = {
  id: string
  name: string
  description: string | null
  localityId: string
  /** Rótulo real da cidade ("Manaus, AM"), resolvido da tabela `localities`. */
  cityLabel: string | null
  /** URL assinada da faixa atual, ou `null` quando não há imagem. */
  bannerUrl: string | null
  /** URL assinada da miniatura atual, ou `null` quando não há imagem. */
  thumbnailUrl: string | null
}

export type MyMembership = {
  communityId: string
  status: "pending" | "approved"
  joinedAt: string
  /**
   * O motivo que o próprio solicitante escreveu ao pedir entrada, quando
   * escreveu. Chega só para o autor: a RLS de `community_join_reasons` libera
   * a linha ao autor e a quem modera, e a consulta ainda filtra por user_id.
   */
  reason: string | null
}

export type PendingRequest = {
  communityId: string
  name: string
  cityLabel: string | null
  requestedAt: string
}

export type CommunitiesPartition = {
  /** Onde a pessoa já é membro aprovado. */
  mine: CommunityCard[]
  /** Pedidos em análise — leitura de status, não pertencimento. */
  pending: PendingRequest[]
  /** Comunidades da cidade visualizada em que a pessoa não é aprovada. */
  discover: CommunityCard[]
}

export function partitionCommunities(
  localCommunities: CommunityCard[],
  memberships: MyMembership[],
  knownCommunitiesById: Map<string, CommunityCard>,
): CommunitiesPartition {
  const membershipByCommunity = new Map(memberships.map((m) => [m.communityId, m]))

  const mine: CommunityCard[] = []
  const discover: CommunityCard[] = []
  for (const community of localCommunities) {
    if (membershipByCommunity.get(community.id)?.status === "approved") {
      mine.push(community)
    } else {
      // Pendentes continuam listáveis na descoberta: a apresentação delas é
      // que troca para o resumo "em análise", sem nunca sugerir pertencimento.
      discover.push(community)
    }
  }

  const pending: PendingRequest[] = []
  for (const membership of memberships) {
    if (membership.status !== "pending") continue
    const community = knownCommunitiesById.get(membership.communityId)
    // Comunidade excluída ou fora do meu alcance de leitura: nada honesto
    // para mostrar, então nada aparece — não se inventa linha.
    if (!community) continue
    pending.push({
      communityId: community.id,
      name: community.name,
      cityLabel: community.cityLabel,
      requestedAt: membership.joinedAt,
    })
  }
  pending.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))

  return { mine, pending, discover }
}

export function filterCommunities(communities: CommunityCard[], query: string): CommunityCard[] {
  const needle = query.trim().toLocaleLowerCase("pt-BR")
  if (needle.length === 0) return communities
  return communities.filter(
    (community) =>
      community.name.toLocaleLowerCase("pt-BR").includes(needle) ||
      (community.description ?? "").toLocaleLowerCase("pt-BR").includes(needle),
  )
}

/** "10 de set." a partir de `joined_at` real — nunca uma data chumbada. */
export function formatRequestedOn(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(/\.$/, "")
}
