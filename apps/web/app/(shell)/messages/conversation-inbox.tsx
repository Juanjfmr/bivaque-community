"use client"

import { Button, Input, ListBox, Modal, useOverlayState } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import {
  ChatThread,
  CONTEXT_LABELS,
  formatLastMessagePreview,
} from "../../components/bivaque/chat-thread"
import { ModalCloseTrigger } from "../../components/bivaque/close-button"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { MessagesIllustration } from "../../components/bivaque/illustrations"
import { ConversationListSkeleton } from "../../components/bivaque/skeleton"
import { showToast } from "../../components/bivaque/toast"

type ConversationRow = {
  id: string
  participant_a: string
  participant_b: string
  context_type: string
  context_id: string
  created_at: string
}

type ProfileRow = {
  user_id: string
  display_name: string
}

type LastMsgRow = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

type ContactRow = {
  user_id: string
  display_name: string
  group_id: string
  group_name: string
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = now - then
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return "agora"
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

// A conversa passa a ter URL propria (spec C12): selecionar na lista navega
// para /messages/<id>, e abrir o endereco direto reconstroi a mesma tela —
// o servidor ja conferiu que a linha existe e e do membro antes de montar
// este componente. Estado de selecao local nao e mais a fonte da verdade.
export function ConversationInbox({
  activeConversationId,
}: {
  activeConversationId: string | null
}) {
  const supabase = useMemo(() => createBrowserClient(), [])
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [profiles, setProfiles] = useState<Map<string, ProfileRow>>(new Map())
  const [lastMessages, setLastMessages] = useState<Map<string, LastMsgRow>>(new Map())
  // Contador de não lidas por conversa (pendência do RECON-032). Vem de
  // dm_messages de TERCEIROS depois do last_read_at do próprio membro — a mesma
  // fonte que /pedidos/[id] usa, sem inventar "não lida" no cliente.
  const [unreadByConversation, setUnreadByConversation] = useState<Map<string, number>>(new Map())
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set())
  const [blockedByOthers, setBlockedByOthers] = useState<Set<string>>(new Set())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // new conversation picker
  const pickerState = useOverlayState()
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerError, setPickerError] = useState<string | null>(null)
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [pickerSearch, setPickerSearch] = useState("")
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const initialLoadDone = useRef(false)

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    setIsMobile(mq.matches)
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // ── auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!cancelled && user) {
        setUserId(user.id)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  // ── load conversations ────────────────────────────────────────────────────
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

    const convData = (convs as ConversationRow[]) ?? []
    setConversations(convData)

    if (convData.length === 0) {
      setLoading(false)
      return
    }

    // collect other participant ids
    const otherIds = new Set<string>()
    for (const c of convData) {
      otherIds.add(c.participant_a === userId ? c.participant_b : c.participant_a)
    }

    // batch-load profiles
    const { data: profData, error: profError } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", Array.from(otherIds))

    if (!profError && profData) {
      const map = new Map<string, ProfileRow>()
      for (const p of profData as ProfileRow[]) {
        map.set(p.user_id, p)
      }
      setProfiles(map)
    }

    // batch-load last message per conversation
    const convIds = convData.map((c) => c.id)
    const lastMsgMap = new Map<string, LastMsgRow>()

    const msgPromises = convIds.map(async (cid) => {
      const { data } = await supabase
        .from("dm_messages")
        .select("id, conversation_id, sender_id, content, created_at")
        .eq("conversation_id", cid)
        .order("created_at", { ascending: false })
        .limit(1)
      if (data && data.length > 0) {
        return data[0] as LastMsgRow
      }
      return null
    })

    const msgs = await Promise.all(msgPromises)
    for (const msg of msgs) {
      if (msg) lastMsgMap.set(msg.conversation_id, msg)
    }
    setLastMessages(lastMsgMap)

    // Não lidas: o last_read_at do membro nesta conversa (RLS: só o próprio) e,
    // a partir dele, as mensagens de terceiros ainda não lidas.
    const { data: readData } = await supabase
      .from("dm_read_states")
      .select("conversation_id, last_read_at")
      .eq("user_id", userId)

    const lastReadByConv = new Map<string, string>()
    for (const row of (readData ?? []) as { conversation_id: string; last_read_at: string }[]) {
      lastReadByConv.set(row.conversation_id, row.last_read_at)
    }

    const unreadMap = new Map<string, number>()
    await Promise.all(
      convIds.map(async (cid) => {
        const lastRead = lastReadByConv.get(cid)
        // Sem estado de leitura gravado, a conversa inteira é não lida — é o
        // caso de quem nunca abriu a thread.
        let query = supabase
          .from("dm_messages")
          .select("id")
          .eq("conversation_id", cid)
          .neq("sender_id", userId)
        if (lastRead) query = query.gt("created_at", lastRead)
        const { data: unreadRows } = await query
        const unreadCount = (unreadRows ?? []).length
        if (unreadCount > 0) unreadMap.set(cid, unreadCount)
      }),
    )
    setUnreadByConversation(unreadMap)

    // load blocks
    const { data: blockData } = await supabase
      .from("dm_blocks")
      .select("*")
      .or(`blocker_user_id.eq.${userId},blocked_user_id.eq.${userId}`)

    if (blockData) {
      const blocked = new Set<string>()
      const blockedBy = new Set<string>()
      for (const b of blockData as { blocker_user_id: string; blocked_user_id: string }[]) {
        if (b.blocker_user_id === userId) {
          blocked.add(b.blocked_user_id)
        } else {
          blockedBy.add(b.blocker_user_id)
        }
      }
      setBlockedIds(blocked)
      setBlockedByOthers(blockedBy)
    }

    setLoading(false)
  }, [userId, supabase])

  useEffect(() => {
    if (!initialLoadDone.current && userId) {
      initialLoadDone.current = true
      loadConversations()
    }
  }, [userId, loadConversations])

  // ── helpers ───────────────────────────────────────────────────────────────
  const otherUserId = useCallback(
    (conv: ConversationRow): string =>
      conv.participant_a === userId ? conv.participant_b : conv.participant_a,
    [userId],
  )

  const otherDisplayName = useCallback(
    (conv: ConversationRow): string => {
      const oid = otherUserId(conv)
      return profiles.get(oid)?.display_name ?? oid.slice(0, 8)
    },
    [otherUserId, profiles],
  )

  const selectConversation = useCallback(
    (convId: string) => {
      router.push(`/messages/${convId}`)
    },
    [router],
  )

  // ── blocking ──────────────────────────────────────────────────────────────
  const handleBlock = useCallback(
    async (convId: string) => {
      const conv = conversations.find((c) => c.id === convId)
      if (!conv || !userId) return
      const oid = otherUserId(conv)

      const { error: blockError } = await supabase.from("dm_blocks").insert({
        blocker_user_id: userId,
        blocked_user_id: oid,
      })

      if (blockError) {
        showToast({ title: "Erro ao bloquear", description: blockError.message, variant: "danger" })
        return
      }

      setBlockedIds((prev) => new Set(prev).add(oid))
      showToast({ title: "Usuário bloqueado", variant: "success" })
    },
    [conversations, userId, supabase, otherUserId],
  )

  const handleUnblock = useCallback(
    async (convId: string) => {
      const conv = conversations.find((c) => c.id === convId)
      if (!conv || !userId) return
      const oid = otherUserId(conv)

      const { error: unblockError } = await supabase
        .from("dm_blocks")
        .delete()
        .eq("blocker_user_id", userId)
        .eq("blocked_user_id", oid)

      if (unblockError) {
        showToast({
          title: "Erro ao desbloquear",
          description: unblockError.message,
          variant: "danger",
        })
        return
      }

      setBlockedIds((prev) => {
        const next = new Set(prev)
        next.delete(oid)
        return next
      })
      showToast({ title: "Usuário desbloqueado", variant: "success" })
    },
    [conversations, userId, supabase, otherUserId],
  )

  // ── new conversation picker ───────────────────────────────────────────────
  const openPicker = useCallback(async () => {
    pickerState.open()
    setPickerLoading(true)
    setPickerError(null)
    setCreateError(null)
    setContacts([])
    setPickerSearch("")

    if (!userId) {
      setPickerLoading(false)
      return
    }

    // get my approved group memberships
    const { data: myGroups, error: groupError } = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("user_id", userId)
      .eq("status", "approved")

    if (groupError || !myGroups || myGroups.length === 0) {
      setPickerLoading(false)
      if (!groupError) {
        setPickerError(
          "Você ainda não participa de grupos. Entre em um grupo ou evento para poder iniciar conversas.",
        )
      } else {
        setPickerError("Erro ao buscar grupos. Tente novamente.")
      }
      return
    }

    const groupIds = myGroups.map((g: { group_id: string }) => g.group_id)

    // get other approved members in those groups, with group name
    const { data: members, error: memberError } = await supabase
      .from("group_memberships")
      .select("user_id, group_id, groups(name)")
      .in("group_id", Array.from(new Set(groupIds)))
      .eq("status", "approved")
      .neq("user_id", userId)

    if (memberError) {
      setPickerError("Erro ao buscar contatos. Tente novamente.")
      setPickerLoading(false)
      return
    }

    if (!members || members.length === 0) {
      setPickerError("Nenhum contato disponível no momento.")
      setPickerLoading(false)
      return
    }

    // get profiles for found users
    const userIds = Array.from(new Set(members.map((m: { user_id: string }) => m.user_id)))
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds)

    const nameMap = new Map<string, string>()
    if (profs) {
      for (const p of profs as ProfileRow[]) {
        nameMap.set(p.user_id, p.display_name)
      }
    }

    // filter out existing conversation partners
    const existingPartners = new Set<string>()
    for (const c of conversations) {
      existingPartners.add(otherUserId(c))
    }

    // build contacts, dedup by user_id (first group wins)
    const seen = new Set<string>()
    const contactList: ContactRow[] = []
    for (const m of members as {
      user_id: string
      group_id: string
      groups: { name: string } | null
    }[]) {
      if (seen.has(m.user_id) || existingPartners.has(m.user_id)) continue
      seen.add(m.user_id)
      contactList.push({
        user_id: m.user_id,
        display_name: nameMap.get(m.user_id) ?? m.user_id.slice(0, 8),
        group_id: m.group_id,
        group_name: m.groups?.name ?? "Grupo",
      })
    }

    setContacts(contactList)
    setPickerLoading(false)
  }, [userId, supabase, conversations, otherUserId, pickerState.open])

  const filteredContacts = useMemo(() => {
    if (!pickerSearch.trim()) return contacts
    const s = pickerSearch.toLowerCase()
    return contacts.filter(
      (c) => c.display_name.toLowerCase().includes(s) || c.group_name.toLowerCase().includes(s),
    )
  }, [contacts, pickerSearch])

  // A criacao passa pelo RPC `open_conversation` (20260825212538): ele
  // resolve a ordem dos participantes, confere no servidor que existe contexto
  // autorizado entre as duas contas e e idempotente — o insert direto da versao
  // anterior morreu junto do grant (a UI falhava em silencio neste caminho).
  const handleCreateConversation = useCallback(
    async (contact: ContactRow) => {
      if (!userId || creatingConversation) return
      setCreatingConversation(true)
      setCreateError(null)

      const { data, error: rpcError } = await supabase.rpc("open_conversation", {
        p_other_user_id: contact.user_id,
        p_context_type: "shared_group",
        p_context_id: contact.group_id,
      })

      if (rpcError || !data) {
        const friendlyMsg = rpcError?.message.includes("no valid context")
          ? "Não é possível iniciar conversa: vocês não compartilham um contexto válido (grupo, evento, recomendação ou família)."
          : rpcError?.message.includes("invalid conversation")
            ? "Não é possível abrir conversa com esta conta."
            : "Não foi possível iniciar a conversa agora. Tente novamente."

        setCreateError(friendlyMsg)
        setCreatingConversation(false)
        return
      }

      const newConvId = String(data)
      pickerState.close()
      setCreatingConversation(false)

      await loadConversations()
      router.push(`/messages/${newConvId}`)
      showToast({ title: "Conversa iniciada!", variant: "success" })
    },
    [userId, creatingConversation, supabase, loadConversations, pickerState.close, router],
  )

  // Abrir a conversa a marca como lida — no servidor, pelo RPC que reconfere a
  // participação, e não só no cliente. Vale para o clique e para quem abre a URL
  // direta. O contador local zera junto para a lista não piscar o número velho.
  useEffect(() => {
    if (!activeConversationId || !userId) return
    let cancelled = false
    void (async () => {
      const { error } = await supabase.rpc("mark_conversation_read", {
        p_conversation_id: activeConversationId,
      })
      if (error) {
        // Falha de marcação não derruba a tela: o contador só não zera agora.
        return
      }
      if (cancelled) return
      setUnreadByConversation((previous) => {
        if (!previous.has(activeConversationId)) return previous
        const next = new Map(previous)
        next.delete(activeConversationId)
        return next
      })
    })()
    return () => {
      cancelled = true
    }
  }, [activeConversationId, userId, supabase])

  // ── render ───────────────────────────────────────────────────────────────
  const selectedConv = conversations.find((c) => c.id === activeConversationId)
  const selectedOtherId = selectedConv ? otherUserId(selectedConv) : null
  const isBlocked = selectedOtherId !== null ? blockedIds.has(selectedOtherId) : false
  const isBlockedByOther = selectedOtherId !== null ? blockedByOthers.has(selectedOtherId) : false

  const showThreadOnMobile = activeConversationId !== null
  const listHref = "/messages"

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Page header. `top-0`, não `top-12`: o main já começa abaixo do
          cabeçalho do shell, então o deslocamento de 48px empurrava esta barra
          sobre o conteúdo — ela cobria o cabeçalho da conversa e o botão
          Bloquear ficava inalcançável no desktop. */}
      <div className="sticky top-0 z-30 border-b border-border bg-[var(--surface)] px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            {showThreadOnMobile && (
              <button
                type="button"
                onClick={() => router.push(listHref)}
                className="motion-press mr-1 flex h-11 w-11 items-center justify-center rounded-md md:hidden text-muted hover:bg-[var(--surface-subtle)]"
                aria-label="Voltar para conversas"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <title>Voltar</title>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-semibold tracking-tight">Mensagens</h1>
          </div>
          <Button size="sm" variant="primary" onPress={() => openPicker()}>
            Nova conversa
          </Button>
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1">
        {/* Loading state */}
        {loading && (
          <div className="w-full px-4 py-4" aria-busy="true">
            <ConversationListSkeleton />
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="w-full px-4 py-4">
            <ErrorState message={error} onRetry={() => loadConversations()} />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && conversations.length === 0 && (
          <div className="w-full px-4 py-4">
            <EmptyState
              title="Nenhuma conversa ainda"
              description="Converse com membros do seu grupo, participantes de eventos ou pessoas da sua rede."
              illustration={<MessagesIllustration />}
              action={
                <Button size="sm" variant="primary" onPress={() => openPicker()}>
                  Iniciar conversa
                </Button>
              }
            />
          </div>
        )}

        {/* Two-pane chat */}
        {!loading && !error && conversations.length > 0 && (
          <div className="flex w-full">
            {/* Conversation list — hidden on mobile when thread is open */}
            <div
              className={`${
                showThreadOnMobile ? "hidden" : "flex"
              } md:flex w-full md:w-80 shrink-0 flex-col border-r border-border`}
            >
              <ListBox
                aria-label="Conversas"
                selectionMode="single"
                selectedKeys={activeConversationId ? [activeConversationId] : []}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys)[0]
                  if (typeof key === "string") selectConversation(key)
                }}
                className="flex-1 overflow-y-auto py-1"
              >
                {conversations.map((conv) => {
                  const oid = otherUserId(conv)
                  const name = profiles.get(oid)?.display_name ?? oid.slice(0, 8)
                  const lastMsg = lastMessages.get(conv.id) ?? null
                  const preview = formatLastMessagePreview(lastMsg, userId ?? "")
                  const blocked = blockedIds.has(oid)
                  const blockedBy = blockedByOthers.has(oid)
                  const unread = unreadByConversation.get(conv.id) ?? 0

                  return (
                    <ListBox.Item key={conv.id} id={conv.id} textValue={name}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-medium">{name}</span>
                        {unread > 0 && (
                          <span
                            className="shrink-0 rounded-full bg-[var(--semantic-action-primary)] px-1.5 text-[0.8125rem] font-semibold text-[var(--semantic-text-on-strong)]"
                            title={
                              unread === 1 ? "1 mensagem não lida" : `${unread} mensagens não lidas`
                            }
                          >
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                        {lastMsg && (
                          <span className="shrink-0 text-[0.8125rem] text-muted">
                            {formatRelativeTime(lastMsg.created_at)}
                          </span>
                        )}
                      </div>
                      {/* min-w-0 no preview: sem ele o truncate ocupa a linha
                          inteira no flex e o contador é empurrado para fora do
                          clip do item — o elemento tinha caixa e cor, e o pixel
                          medido era o do fundo. Medido no pixel, não no olho. */}
                      <div className="mt-0.5 flex items-center gap-1.5">
                        {preview ? (
                          <span className="min-w-0 truncate text-xs text-muted">{preview}</span>
                        ) : (
                          <span className="min-w-0 truncate text-xs text-muted">
                            {CONTEXT_LABELS[conv.context_type] ?? conv.context_type}
                          </span>
                        )}
                      </div>
                      {(blocked || blockedBy) && (
                        <span className="text-[0.8125rem] text-[var(--danger)]">
                          {blockedBy ? "Bloqueado(a)" : "Você bloqueou"}
                        </span>
                      )}
                    </ListBox.Item>
                  )
                })}
              </ListBox>
            </div>

            {/* Thread pane */}
            <div
              className={`${
                showThreadOnMobile ? "flex" : "hidden"
              } md:flex flex-1 flex-col min-h-0`}
            >
              {!selectedConv ? (
                <div className="hidden md:flex flex-1 items-center justify-center">
                  <p className="text-sm text-muted">Selecione uma conversa</p>
                </div>
              ) : userId ? (
                <ChatThread
                  key={selectedConv.id}
                  supabase={supabase}
                  conversationId={selectedConv.id}
                  userId={userId}
                  otherDisplayName={otherDisplayName(selectedConv)}
                  contextType={selectedConv.context_type}
                  isBlockedByOther={isBlockedByOther}
                  isBlocked={isBlocked}
                  onBlock={handleBlock}
                  onUnblock={handleUnblock}
                  onBack={() => router.push(listHref)}
                  isMobile={isMobile}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Picker Modal */}
      <Modal state={pickerState}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading className="text-base font-semibold">Nova conversa</Modal.Heading>
                <ModalCloseTrigger className="min-h-11 min-w-11" />
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted">
                  Pessoas com quem você pode conversar (compartilham um grupo, evento, recomendação
                  ou vínculo familiar).
                </p>

                {createError && <FeedbackAlert variant="danger" description={createError} />}

                {pickerLoading && (
                  <div className="space-y-2 py-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-12 animate-pulse rounded-md bg-[var(--surface-sunken)]"
                      />
                    ))}
                  </div>
                )}

                {!pickerLoading && pickerError && !createError && (
                  <FeedbackAlert variant="warning" description={pickerError} />
                )}

                {!pickerLoading && !pickerError && contacts.length > 0 && (
                  <>
                    <Input
                      placeholder="Buscar por nome ou grupo..."
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch((e.target as HTMLInputElement).value)}
                      className="mt-1"
                    />

                    <ListBox
                      aria-label="Contatos"
                      selectionMode="single"
                      disabledKeys={
                        creatingConversation ? filteredContacts.map((c) => c.user_id) : []
                      }
                      onAction={(key) => {
                        const contact = filteredContacts.find((c) => c.user_id === key)
                        if (contact) handleCreateConversation(contact)
                      }}
                      className="max-h-64 overflow-y-auto"
                    >
                      {filteredContacts.length === 0 ? (
                        <ListBox.Item key="empty" id="empty" isDisabled>
                          <p className="py-4 text-center text-sm text-muted">
                            Nenhum contato encontrado para &ldquo;{pickerSearch}&rdquo;
                          </p>
                        </ListBox.Item>
                      ) : (
                        filteredContacts.map((contact) => (
                          <ListBox.Item
                            key={contact.user_id}
                            id={contact.user_id}
                            textValue={contact.display_name}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-medium text-[var(--accent)]">
                                {contact.display_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {contact.display_name}
                                </p>
                                <p className="truncate text-xs text-muted">
                                  Grupo: {contact.group_name}
                                </p>
                              </div>
                            </div>
                          </ListBox.Item>
                        ))
                      )}
                    </ListBox>
                  </>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="ghost" onPress={() => pickerState.close()}>
                  Cancelar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  )
}
