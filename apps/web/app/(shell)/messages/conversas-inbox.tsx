"use client"

import type { Route } from "next"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import shellStyles from "../../components/bivaque/app-shell.module.css"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { MessagesIllustration } from "../../components/bivaque/illustrations"
import { ConversationListSkeleton } from "../../components/bivaque/skeleton"
import {
  buildInboxEntries,
  type ConversationRow,
  counterpartIdOf,
  type InboxAudience,
  type InboxEntry,
  inboxCopyFor,
  type LastMessageRow,
  type ProviderProfileRow,
} from "./conversas-loaders"

// FIGMA-001 — apresentação da caixa de conversas (prancha 221:43252),
// compartilhada pelos dois shells que têm participante de conversa: o shell do
// membro (/messages) e o painel do prestador (/prestador/conversas). O
// mecanismo é o existente: dm_conversations / dm_messages com RLS de
// participante (20260802001500). Sem selo de "não lida": o schema não tem
// estado de leitura e o contrato proíbe inventar estado.
//
// Títulos: nomes pessoais via profiles e, para quem não aparece lá, pelo RPC
// estreito conversation_counterpart_name (20260825212538); em contexto
// provider, quem consome vê o nome comercial da ficha e quem é dono vê o nome
// do membro — resolvido POR CONVERSA em buildInboxEntries, sem sobrescrever o
// map de nomes pessoais.

type ProfileRow = {
  user_id: string
  display_name: string
}

interface ConversasInboxProps {
  /** Base da URL estável do detalhe e do cleanup do param legado. */
  inboxBase?: string
  /**
   * Reparos finais FIGMA-001 (06/10/2026): de que lado do balcão a caixa é
   * lida. O membro (padrão) vê respostas de prestadores; o dono da ficha vê
   * pedidos de membros. Só copy — mecanismo, RLS e estados são os mesmos.
   */
  audience?: InboxAudience
}

export function ConversasInbox({
  inboxBase = "/messages",
  audience = "member",
}: ConversasInboxProps) {
  const supabase = createBrowserClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [userId, setUserId] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authKey, setAuthKey] = useState(0)
  const [entries, setEntries] = useState<InboxEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initialLoadDone = useRef(false)

  // Compatibilidade com navegações antigas (?conversation=<id>): a URL estável
  // desta versão é <base>/<id>, então o param vira um replace — nunca conteúdo
  // duplicado nem seleção silenciosa.
  const legacyConversationParam = searchParams.get("conversation")

  const loadConversations = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)

    const { data: convs, error: convError } = await supabase
      .from("dm_conversations")
      .select("*")
      .order("created_at", { ascending: false })

    if (convError) {
      setError("Não foi possível carregar as conversas. Tente novamente.")
      setLoading(false)
      return
    }

    const conversations = (convs as ConversationRow[]) ?? []
    if (conversations.length === 0) {
      setEntries([])
      setLoading(false)
      return
    }

    const otherIds = Array.from(new Set(conversations.map((c) => counterpartIdOf(c, userId))))

    const names = new Map<string, string>()
    const { data: profData, error: profError } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", otherIds)

    if (!profError && profData) {
      for (const profile of (profData as ProfileRow[]) ?? []) {
        names.set(profile.user_id, profile.display_name)
      }
    }

    const missing = otherIds.filter((id) => !names.has(id))
    await Promise.all(
      missing.map(async (id) => {
        const conversation = conversations.find((c) => counterpartIdOf(c, userId) === id)
        if (!conversation) return
        const { data } = await supabase.rpc("conversation_counterpart_name", {
          p_conversation_id: conversation.id,
        })
        if (typeof data === "string" && data.trim().length > 0) names.set(id, data)
      }),
    )

    const lastMessages = new Map<string, LastMessageRow>()
    const latest = await Promise.all(
      conversations.map(async (conversation) => {
        const { data, error: lastError } = await supabase
          .from("dm_messages")
          .select("id, conversation_id, sender_id, content, created_at")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(1)
        return { message: (data?.[0] as LastMessageRow | undefined) ?? null, error: lastError }
      }),
    )
    // Falha em qualquer prévia NÃO vira caixa incompleta apresentada como
    // sucesso: a caixa inteira é estado recuperável com nova tentativa.
    if (latest.some((entry) => entry.error)) {
      setError("Não foi possível carregar as conversas. Tente novamente.")
      setLoading(false)
      return
    }
    for (const entry of latest) {
      if (entry.message) lastMessages.set(entry.message.conversation_id, entry.message)
    }

    const providerConvs = conversations.filter((c) => c.context_type === "provider")
    const providersByContext = new Map<string, ProviderProfileRow>()
    if (providerConvs.length > 0) {
      const { data: providerRows } = await supabase
        .from("provider_profiles")
        .select("id, display_name, owner_user_id")
        .in(
          "id",
          providerConvs.map((c) => c.context_id),
        )
      for (const row of (providerRows as ProviderProfileRow[]) ?? []) {
        providersByContext.set(row.id, row)
      }
    }

    setEntries(
      buildInboxEntries(conversations, names, lastMessages, userId, Date.now(), providersByContext),
    )
    setLoading(false)
  }, [userId, supabase])

  useEffect(() => {
    // authKey é o gatilho do retry de sessão; a referência explícita é o
    // contrato com useExhaustiveDependencies.
    void authKey
    let cancelled = false
    ;(async () => {
      setAuthError(null)
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()
      if (cancelled) return
      if (error || !user) {
        // Sem skeleton infinito: falha de sessão/rede é estado recuperável.
        setAuthError(
          "Não foi possível confirmar sua sessão agora. Verifique sua conexão e tente novamente.",
        )
        setLoading(false)
        return
      }
      setUserId(user.id)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, authKey])

  useEffect(() => {
    if (!initialLoadDone.current && userId) {
      initialLoadDone.current = true
      loadConversations()
    }
  }, [userId, loadConversations])

  useEffect(() => {
    if (!legacyConversationParam) return
    if (loading) return
    const known = entries.some((entry) => entry.id === legacyConversationParam)
    if (known) {
      router.replace(`${inboxBase}/${legacyConversationParam}` as Route)
    } else {
      // Param aponta para conversa que não é desta pessoa (ou não existe):
      // a RLS já devolveu a caixa sem ela; limpa a URL sem navegar.
      router.replace(inboxBase as Route)
    }
  }, [legacyConversationParam, entries, loading, router, inboxBase])

  const copy = inboxCopyFor(audience)

  return (
    <div className={shellStyles["view"]}>
      <h1 className={shellStyles["heading"]}>Conversas</h1>
      <p className={shellStyles["subtitle"]}>{copy.subtitle}</p>

      {authError && <ErrorState message={authError} onRetry={() => setAuthKey((key) => key + 1)} />}

      {!authError && loading && (
        <div aria-busy="true">
          <ConversationListSkeleton />
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={() => loadConversations()} />}

      {!authError && !loading && !error && entries.length === 0 && (
        <EmptyState
          title={copy.emptyTitle}
          description={copy.emptyDescription}
          illustration={<MessagesIllustration />}
        />
      )}

      {!authError &&
        !loading &&
        !error &&
        entries.map((entry) => (
          <a key={entry.id} href={`${inboxBase}/${entry.id}`} className={shellStyles["inboxCard"]}>
            <p className={shellStyles["cardTitle"]}>{entry.title}</p>
            <p className={shellStyles["cardContext"]}>{entry.contextLabel}</p>
            {entry.preview && <p className={shellStyles["cardPreview"]}>{entry.preview}</p>}
            {entry.timeLabel && <p className={shellStyles["cardTime"]}>{entry.timeLabel}</p>}
          </a>
        ))}
    </div>
  )
}
