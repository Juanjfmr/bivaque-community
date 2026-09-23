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

// ── Grupos (FE-GRUPOS-ALCANCAVEIS, 19/09/2026) ─────────────────────────────
//
// Um grupo de CIDADE (`community_id` nulo) não aparecia em tela nenhuma deste
// destino: a aba "Grupos" de uma comunidade filtra por `community_id`, e
// `/groups` — a única lista que o mostra — não tinha entrada na navegação, só
// links condicionais. Medido em produção (`main` 90e4c94), com um grupo real do
// dono invisível no login dele.
//
// A partição é pura de propósito, como `partitionCommunities`: a regra que
// decide "o que é meu" e "o que é da cidade" precisa ser auditável longe do JSX.

/** Teto de "meus grupos" numa única leitura; a tela avisa quando é atingido. */
export const MY_GROUPS_LIMIT = 50

export type CommunityGroupCard = {
  id: string
  name: string
  description: string | null
  visibility: "public" | "private"
  /** Cidade do grupo — pode ser outra quando eu participo de um grupo de fora. */
  localityId: string
  cityLabel: string | null
  /** `community_id` nulo: grupo da cidade, sem comunidade. */
  cityLevel: boolean
  /** Participo com vínculo aprovado (lido de `group_memberships`). */
  participating: boolean
  /**
   * Aprovados, quando existe leitura COMPLETA; `null` = indisponível.
   *
   * Hoje sempre `null`: a contagem pela Data API é limitada por `max_rows` e
   * `group_memberships` responde no máximo mil linhas por consulta, então um
   * grupo cheio devolveria um número menor que o real sem erro nenhum. Número
   * otimista é pior que ausência de número — a tela omite a linha, nunca
   * afirma "0 membros".
   */
  memberCount: number | null
}

export type GroupsPartition = {
  /** Meus grupos — qualquer cidade, qualquer escopo. */
  mine: CommunityGroupCard[]
  /** Grupos sem comunidade da cidade em exibição em que ainda não participo. */
  city: CommunityGroupCard[]
}

/**
 * Grupos que eu já tenho e grupos da cidade que ainda não são meus.
 *
 * O grupo de comunidade NÃO entra em `city`: ele já tem casa na aba "Grupos" da
 * própria comunidade, e listá-lo aqui inventaria uma segunda porta para a mesma
 * sala. A comparação de cidade é por `localityId`, não por confiança na consulta
 * que montou a lista — é a mesma razão pela qual `partitionCommunities` recebe a
 * cidade em exibição em vez de assumir que todo mundo já veio filtrado.
 */
export function partitionGroupCards(
  groups: CommunityGroupCard[],
  viewingLocalityId: string | null,
): GroupsPartition {
  const mine: CommunityGroupCard[] = []
  const city: CommunityGroupCard[] = []
  for (const group of groups) {
    if (group.participating) {
      mine.push(group)
      continue
    }
    if (group.cityLevel && viewingLocalityId !== null && group.localityId === viewingLocalityId) {
      city.push(group)
    }
  }
  const byName = (a: CommunityGroupCard, b: CommunityGroupCard) =>
    a.name.localeCompare(b.name, "pt-BR")
  mine.sort(byName)
  city.sort(byName)
  return { mine, city }
}
