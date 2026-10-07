"use client"

import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@bivaque/domain"
import type { SupabaseClient } from "@supabase/supabase-js"
import { useCallback, useEffect, useState } from "react"
import type { Database } from "supabase/database.generated"
import { ChatThread } from "../../components/bivaque/chat-thread"
import threadStyles from "../../components/bivaque/chat-thread.module.css"
import { EmptyState } from "../../components/bivaque/empty-state"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { MessageAreaSkeleton } from "../../components/bivaque/skeleton"
import { showToast } from "../../components/bivaque/toast"
import {
  type BlockRow,
  blockStateFor,
  type ConversationRow,
  contextLabelFor,
  counterpartIdOf,
  originHrefFor,
  type ProviderProfileRow,
  providerConversationTitle,
} from "./conversas-loaders"

// FIGMA-001 — detalhe da conversa por URL estável (/messages/<id>).
//
// A RLS de dm_conversations (20260802001500) devolve ZERO linhas para quem não
// participa: a tela transforma isso no estado honesto "não disponível", nunca
// em conteúdo alheio nem em 404 falso. Refresh e URL direta reconstroem a
// mesma conversa porque tudo aqui é lido do banco a cada montagem.

interface ConversationScreenProps {
  supabase: SupabaseClient<Database>
  conversationId: string
  userId: string
  backHref?: string
}

export function ConversationScreen({
  supabase,
  conversationId,
  userId,
  backHref = "/messages",
}: ConversationScreenProps) {
  const [conversation, setConversation] = useState<ConversationRow | null>(null)
  const [otherName, setOtherName] = useState<string | null>(null)
  const [providerRow, setProviderRow] = useState<ProviderProfileRow | null>(null)
  const [contextTitle, setContextTitle] = useState<string | null>(null)
  const [listingOriginUnavailable, setListingOriginUnavailable] = useState(false)
  const [blockedIds, setBlockedIds] = useState<{ blocked: boolean; byOther: boolean }>({
    blocked: false,
    byOther: false,
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadKey, setLoadKey] = useState(0)

  useEffect(() => {
    // loadKey é o gatilho do botão "Tentar novamente": a referência explícita
    // é o contrato com useExhaustiveDependencies — mudar o key relê tudo.
    void loadKey
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError(null)
      setListingOriginUnavailable(false)

      const { data, error } = await supabase
        .from("dm_conversations")
        .select("*")
        .eq("id", conversationId)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        // Erro cru do PostgREST nunca vai para a tela: mensagem segura com
        // nova tentativa (revisão independente GLM, 05/10/2026).
        setLoadError(
          "Não foi possível carregar esta conversa agora. Verifique sua conexão e tente novamente.",
        )
        setLoading(false)
        return
      }
      if (!data) {
        // Não participante ou id inexistente: a RLS cala, a tela explica.
        setConversation(null)
        setLoading(false)
        return
      }

      const row = data as ConversationRow
      setConversation(row)
      const otherId = counterpartIdOf(row, userId)

      const [profileResult, nameResult, blocksResult] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", otherId).maybeSingle(),
        supabase.rpc("conversation_counterpart_name", { p_conversation_id: row.id }),
        supabase
          .from("dm_blocks")
          .select("blocker_user_id, blocked_user_id")
          .or(
            `and(blocker_user_id.eq.${userId},blocked_user_id.eq.${otherId}),and(blocker_user_id.eq.${otherId},blocked_user_id.eq.${userId})`,
          ),
      ])
      if (cancelled) return

      const profileName = (profileResult.data as { display_name: string } | null)?.display_name
      const rpcName = typeof nameResult.data === "string" ? nameResult.data : null
      setOtherName(profileName?.trim() || rpcName?.trim() || null)

      // Só o par desta conversa importa: bloqueios de terceiros não marcam
      // nem impedem esta conversa (regressão travada em tests/unit/ui/figma001).
      setBlockedIds(blockStateFor((blocksResult.data as BlockRow[]) ?? [], userId, otherId))

      // Título do contexto: UMA leitura por tipo, todas opcionais. Falhar ou
      // não enxergar o objeto de origem degrada para o rótulo do contexto —
      // a conversa continua abrindo.
      let title: string | null = null
      let listingUnavailable = false
      if (row.context_type === "shared_group") {
        const result = await supabase
          .from("groups")
          .select("name")
          .eq("id", row.context_id)
          .maybeSingle()
        title = (result.data as { name: string } | null)?.name ?? null
      } else if (row.context_type === "shared_event") {
        const result = await supabase
          .from("events")
          .select("title")
          .eq("id", row.context_id)
          .maybeSingle()
        title = (result.data as { title: string } | null)?.title ?? null
      } else if (row.context_type === "recommendation_thread") {
        const result = await supabase
          .from("recommendation_requests")
          .select("title")
          .eq("id", row.context_id)
          .maybeSingle()
        title = (result.data as { title: string } | null)?.title ?? null
      } else if (row.context_type === "listing") {
        const result = await supabase
          .from("listings")
          .select("title")
          .eq("id", row.context_id)
          .maybeSingle()
        title = result.data?.title ?? null
        // ADR-20261006: a origem do anúncio não concede acesso adicional. Se a
        // RLS calou — anúncio pausado, encerrado, ocultado pela moderação ou fora
        // do público atual — a thread diz isso e esconde o atalho. Sem bypass,
        // sem título e sem foto obtidos por outro caminho.
        if (title === null) listingUnavailable = true
      } else if (row.context_type === "provider") {
        const result = await supabase
          .from("provider_profiles")
          .select("id, display_name, owner_user_id, category")
          .eq("id", row.context_id)
          .maybeSingle()
        const provider = result.data as (ProviderProfileRow & { category: ProviderCategory }) | null
        if (provider) setProviderRow(provider)
        // Categoria com o rótulo canônico do domínio, nunca o enum cru.
        title = provider
          ? `${provider.display_name} · ${PROVIDER_CATEGORY_LABELS[provider.category] ?? provider.category}`
          : null
      }
      if (!cancelled) {
        setContextTitle(listingUnavailable ? "Anúncio indisponível" : title)
        if (listingUnavailable) setListingOriginUnavailable(true)
      }

      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [supabase, conversationId, userId, loadKey])

  const handleBlock = useCallback(async () => {
    if (!conversation) return
    const otherId = counterpartIdOf(conversation, userId)
    const { error } = await supabase.from("dm_blocks").insert({
      blocker_user_id: userId,
      blocked_user_id: otherId,
    })
    if (error) {
      showToast({
        title: "Erro ao bloquear",
        description: "Não foi possível bloquear agora. Tente novamente em instantes.",
        variant: "danger",
      })
      return
    }
    setBlockedIds((prev) => ({ ...prev, blocked: true }))
    showToast({ title: "Usuário bloqueado", variant: "success" })
  }, [conversation, userId, supabase])

  const handleUnblock = useCallback(async () => {
    if (!conversation) return
    const otherId = counterpartIdOf(conversation, userId)
    const { error } = await supabase
      .from("dm_blocks")
      .delete()
      .eq("blocker_user_id", userId)
      .eq("blocked_user_id", otherId)
    if (error) {
      showToast({
        title: "Erro ao desbloquear",
        description: "Não foi possível desbloquear agora. Tente novamente em instantes.",
        variant: "danger",
      })
      return
    }
    setBlockedIds((prev) => ({ ...prev, blocked: false }))
    showToast({ title: "Usuário desbloqueado", variant: "success" })
  }, [conversation, userId, supabase])

  if (loading) {
    return (
      <div className={threadStyles["threadView"]} aria-busy="true">
        <MessageAreaSkeleton />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={threadStyles["threadView"]}>
        <a href={backHref} className={threadStyles["backButton"]}>
          ← Conversas
        </a>
        <FeedbackAlert
          variant="danger"
          title="Erro ao carregar a conversa"
          description={loadError}
          actions={
            <button
              type="button"
              className={threadStyles["retryButton"]}
              onClick={() => setLoadKey((key) => key + 1)}
            >
              Tentar novamente
            </button>
          }
        />
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className={threadStyles["threadView"]}>
        <a href={backHref} className={threadStyles["backButton"]}>
          ← Conversas
        </a>
        <EmptyState
          title="Conversa não disponível"
          description="Esta conversa não existe ou você não participa dela. Nenhuma mensagem é exibida para quem não participa."
        />
      </div>
    )
  }

  // Título por conversa: quem consome vê o nome comercial da ficha; o dono da
  // ficha vê o nome pessoal do membro contraparte. Nome pessoal e comercial
  // nunca se misturam (revisão Flash, rodada 1/3).
  const otherId = conversation ? counterpartIdOf(conversation, userId) : null
  const displayedTitle =
    conversation && otherId
      ? (providerConversationTitle(providerRow, otherId, otherName) ?? "Participante")
      : "Participante"

  return (
    <ChatThread
      key={conversation.id}
      supabase={supabase}
      conversationId={conversation.id}
      userId={userId}
      backHref={backHref}
      otherDisplayName={displayedTitle}
      contextLabel={contextLabelFor(conversation.context_type)}
      contextTitle={contextTitle}
      originHref={
        listingOriginUnavailable
          ? null
          : originHrefFor(conversation.context_type, conversation.context_id)
      }
      isBlockedByOther={blockedIds.byOther}
      isBlocked={blockedIds.blocked}
      onBlock={handleBlock}
      onUnblock={handleUnblock}
    />
  )
}
