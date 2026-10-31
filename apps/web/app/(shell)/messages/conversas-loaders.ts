// FIGMA-001 — orquestração pura da central de conversas.
//
// A caixa e o detalhe leem SOMENTE o mecanismo existente (dm_conversations /
// dm_messages / dm_blocks, migration 20260802001500 e o RPC open_conversation de
// 20260825212538). Nada aqui inventa pessoa, contador ou estado: não há coluna
// de leitura no schema, então não há "não lida"; o selo do Figma fica de fora e
// a divergência está registrada em .visual/opencode-figma-20261005/result.md.
//
// Este módulo é deliberadamente puro (sem React, sem Supabase importado): o
// Vitest da casa roda em node sem DOM, então a prova unitária é feita aqui,
// sobre as decisões — rótulo de contexto, href de origem, relógio da caixa e o
// guarda de submit duplicado — exatamente como inicio/home-loaders.ts.

import type { DeliveryStatus } from "../../components/bivaque/message-delivery"

export type ConversationRow = {
  id: string
  participant_a: string
  participant_b: string
  context_type: string
  context_id: string
  created_at: string
}

export type LastMessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

export type InboxEntry = {
  id: string
  title: string
  contextLabel: string
  preview: string
  timeLabel: string
  href: string
}

export type ThreadMessageState = {
  id: string
  content: string
  status: DeliveryStatus
}

// Rótulos dos contextos QUE EXISTEM no enum public.dm_context_type. Contexto
// novo sem enum/migration não entra aqui — é o contrato do lote.
export const CONTEXT_LABELS: Record<string, string> = {
  shared_group: "Grupo em comum",
  shared_event: "Evento em comum",
  recommendation_thread: "Indicação",
  accepted_family: "Família",
  provider: "Prestador",
  listing: "Anúncio de imóvel",
}

// "Ver origem" só aponta para rota que existe hoje no shell do membro.
// accepted_family não tem superfície pública (o vínculo é privado por desenho),
// então devolve null e a tela esconde o botão — nunca link morto.
export function originHrefFor(contextType: string, contextId: string): string | null {
  switch (contextType) {
    case "shared_group":
      return `/groups/${contextId}`
    case "shared_event":
      return `/events/${contextId}`
    case "recommendation_thread":
      return `/publicacoes/${contextId}`
    case "provider":
      return `/prestadores/${contextId}`
    case "listing":
      return `/imoveis/${contextId}`
    default:
      return null
  }
}

export function contextLabelFor(contextType: string): string {
  return CONTEXT_LABELS[contextType] ?? contextType
}

/** O outro participante da conversa, nunca o caller. */
export function counterpartIdOf(conversation: ConversationRow, userId: string): string {
  return conversation.participant_a === userId
    ? conversation.participant_b
    : conversation.participant_a
}

/**
 * Relógio da caixa no eixo do Figma ("Hoje · 10:42", "Ontem · 18:40").
 * Fora desses dois dias cai para data curta pt-BR — jamais "Invalid Date":
 * registro sem data vira string vazia, como message-delivery já faz.
 */
export function formatInboxTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const date = new Date(then)
  const today = new Date(now)
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
  if (then >= startOfToday && then <= now + 86_400_000) return `Hoje · ${time}`
  if (then >= startOfToday - 86_400_000 && then < startOfToday) return `Ontem · ${time}`
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

/** Prévia da última mensagem no formato da caixa: "Você: …" só para as próprias. */
export function lastMessagePreview(lastMessage: LastMessageRow | null, userId: string): string {
  if (!lastMessage) return ""
  const prefix = lastMessage.sender_id === userId ? "Você: " : ""
  const content = lastMessage.content
  return `${prefix}${content.length > 80 ? `${content.slice(0, 80)}…` : content}`
}

export type ProviderProfileRow = {
  id: string
  display_name: string
  owner_user_id: string
}

/**
 * Título da conversa de contexto provider: quem consome vê o NOME COMERCIAL
 * da ficha (provider_profiles.display_name, visível pelo contexto); quem é
 * dono da ficha vê o nome do MEMBRO contraparte — nunca o negócio no lugar
 * da pessoa. Sem RPC/migration novos: um select em provider_profiles, que a
 * policy existente (can_see_provider) já autoriza para ambos os lados.
 */
export function providerConversationTitle(
  provider: ProviderProfileRow | null,
  counterpartId: string,
  memberName: string | null,
): string | null {
  if (provider && provider.owner_user_id === counterpartId) return provider.display_name
  return memberName
}

export function buildInboxEntries(
  conversations: ConversationRow[],
  names: ReadonlyMap<string, string>,
  lastMessages: ReadonlyMap<string, LastMessageRow>,
  userId: string,
  now: number = Date.now(),
  providersByContext: ReadonlyMap<string, ProviderProfileRow> = new Map(),
): InboxEntry[] {
  return conversations
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((conversation) => {
      const otherId = counterpartIdOf(conversation, userId)
      const lastMessage = lastMessages.get(conversation.id) ?? null
      // O título é resolvido POR CONVERSA (context_id), nunca sobrescrevendo o
      // map de nomes pessoais: um dono com duas fichas, ou um par com conversa
      // provider e shared_group ao mesmo tempo, não pode herdar o nome comercial
      // do outro contexto.
      const personalName = names.get(otherId) ?? otherId.slice(0, 8)
      const provider =
        conversation.context_type === "provider"
          ? (providersByContext.get(conversation.context_id) ?? null)
          : null
      return {
        id: conversation.id,
        title: providerConversationTitle(provider, otherId, personalName) ?? personalName,
        contextLabel: contextLabelFor(conversation.context_type),
        preview: lastMessagePreview(lastMessage, userId),
        timeLabel: lastMessage ? formatInboxTime(lastMessage.created_at, now) : "",
        href: `/messages/${conversation.id}`,
      }
    })
}

/**
 * Guarda de submit duplicado: com entrega pendente o botão Enviar fica
 * desabilitado. Sem isso, dois cliques rápidos gravam duas mensagens — o
 * defeito que o contrato manda impedir ("impede submit duplicado enquanto
 * pendente"). Rascunho falho continua na tela como "não enviada" com nova
 * tentativa, então a mensagem nunca se perde no retry.
 */
export function canSubmitReply(draft: string, messages: readonly ThreadMessageState[]): boolean {
  if (draft.trim().length === 0) return false
  return !messages.some((message) => message.status === "sending")
}

export type BlockRow = { blocker_user_id: string; blocked_user_id: string }

/**
 * Estado de bloqueio DO PAR desta conversa (caller ↔ otherId). Bloqueios que
 * envolvem terceiros — outros pares do mesmo usuário — não podem impedir nem
 * marcar a conversa atual: o filtro por par exato é a regressão que o
 * revisão independente de 05/10/2026 exigiu (antes o loop marcava a conversa
 * se QUALQUER bloqueio do usuário existisse).
 */
export function blockStateFor(
  blocks: readonly BlockRow[],
  userId: string,
  otherId: string,
): { blocked: boolean; byOther: boolean } {
  let blocked = false
  let byOther = false
  for (const row of blocks) {
    const isThisPair =
      (row.blocker_user_id === userId && row.blocked_user_id === otherId) ||
      (row.blocker_user_id === otherId && row.blocked_user_id === userId)
    if (!isThisPair) continue
    if (row.blocker_user_id === userId) blocked = true
    if (row.blocked_user_id === userId) byOther = true
  }
  return { blocked, byOther }
}

/**
 * Reparos finais FIGMA-001 (despacho Codex 06/10/2026): a copy da caixa muda
 * por audiência. O membro (consumidor) vê respostas de prestadores — copy
 * travada em manaus-pilot-full-journey.spec.ts e preservada aqui ao pé da
 * letra. O DONO da ficha vê pedidos de membros: a mesma caixa RLS de
 * participante, descrita do lado certo do balcão. Nenhum estado novo: é texto,
 * não schema, não contador, não "não lida".
 */
export type InboxAudience = "member" | "provider"

export interface InboxCopy {
  subtitle: string
  emptyTitle: string
  emptyDescription: string
}

const MEMBER_INBOX_COPY: InboxCopy = {
  subtitle: "Respostas de prestadores, empresas e anunciantes.",
  emptyTitle: "Nenhuma conversa ainda",
  emptyDescription:
    "Conversas nascem de um contexto: o contato com um prestador, uma pergunta em um evento ou um vínculo em comum.",
}

const PROVIDER_INBOX_COPY: InboxCopy = {
  subtitle: "Pedidos de membros sobre a sua ficha e os seus serviços.",
  emptyTitle: "Nenhum pedido de membro ainda",
  emptyDescription: "Quando um membro abrir uma conversa pela sua ficha, o pedido aparece aqui.",
}

export function inboxCopyFor(audience: InboxAudience): InboxCopy {
  return audience === "provider" ? PROVIDER_INBOX_COPY : MEMBER_INBOX_COPY
}
