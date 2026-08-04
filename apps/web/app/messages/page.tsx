"use client"

import { brandTokens } from "@bivaque/tokens"
import { Button, Form, Input, TextArea } from "@heroui/react"
import { useCallback, useEffect, useState } from "react"
import { createBrowserClient } from "../../lib/supabase/client"

type ConversationRow = {
  id: string
  participant_a: string
  participant_b: string
  context_type: "shared_group" | "shared_event" | "recommendation_thread" | "accepted_family"
  context_id: string
  created_at: string
}

type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

type BlockRow = {
  blocker_user_id: string
  blocked_user_id: string
}

const CONTEXT_LABELS: Record<string, string> = {
  shared_group: "Grupo em comum",
  shared_event: "Evento em comum",
  recommendation_thread: "Recomendacao",
  accepted_family: "Familia",
}

export default function MessagesPage() {
  const supabase = createBrowserClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [blocks, setBlocks] = useState<BlockRow[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState("")

  const loadUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
    }
  }, [supabase])

  const loadConversations = useCallback(async () => {
    const { data, error: convError } = await supabase
      .from("dm_conversations")
      .select("*")
      .order("created_at", { ascending: false })

    if (convError) {
      setError(convError.message)
      return
    }

    setConversations((data as ConversationRow[]) ?? [])
  }, [supabase])

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const { data, error: msgError } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (msgError) {
        setError(msgError.message)
        return
      }

      setMessages((data as MessageRow[]) ?? [])
    },
    [supabase],
  )

  const loadBlocks = useCallback(async () => {
    const { data, error: blockError } = await supabase
      .from("dm_blocks")
      .select("*")
      .or(`blocker_user_id.eq.${userId},blocked_user_id.eq.${userId}`)

    if (blockError) {
      // blocks may be empty, not a critical error
      return
    }

    setBlocks((data as BlockRow[]) ?? [])
  }, [supabase, userId])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  useEffect(() => {
    if (userId) {
      setLoading(true)
      void loadConversations().then(() => setLoading(false))
      void loadBlocks()
    }
  }, [userId, loadConversations, loadBlocks])

  useEffect(() => {
    if (selectedConversationId) {
      void loadMessages(selectedConversationId)
    }
  }, [selectedConversationId, loadMessages])

  const selectConversation = useCallback((conversationId: string) => {
    setSelectedConversationId(conversationId)
    setReportingMessageId(null)
    setError(null)
  }, [])

  const otherParticipantId = useCallback(
    (conversation: ConversationRow) => {
      return conversation.participant_a === userId
        ? conversation.participant_b
        : conversation.participant_a
    },
    [userId],
  )

  const isBlocked = useCallback(
    (otherId: string) => {
      return blocks.some(
        (b) =>
          (b.blocker_user_id === userId && b.blocked_user_id === otherId) ||
          (b.blocker_user_id === otherId && b.blocked_user_id === userId),
      )
    },
    [blocks, userId],
  )

  const isBlockedByOther = useCallback(
    (otherId: string) => {
      return blocks.some((b) => b.blocker_user_id === otherId && b.blocked_user_id === userId)
    },
    [blocks, userId],
  )

  const handleSendMessage = useCallback(async () => {
    if (!selectedConversationId || !userId || !newMessage.trim()) return

    setError(null)
    const content = newMessage.trim()

    const { error: sendError } = await supabase.from("dm_messages").insert({
      conversation_id: selectedConversationId,
      sender_id: userId,
      content,
    })

    if (sendError) {
      setError(sendError.message)
      return
    }

    setNewMessage("")
    void loadMessages(selectedConversationId)
  }, [selectedConversationId, userId, newMessage, supabase, loadMessages])

  const handleBlock = useCallback(
    async (otherId: string) => {
      if (!userId) return
      setError(null)

      const { error: blockError } = await supabase.from("dm_blocks").insert({
        blocker_user_id: userId,
        blocked_user_id: otherId,
      })

      if (blockError) {
        setError(blockError.message)
        return
      }

      void loadBlocks()
    },
    [userId, supabase, loadBlocks],
  )

  const handleUnblock = useCallback(
    async (otherId: string) => {
      if (!userId) return
      setError(null)

      const { error: unblockError } = await supabase
        .from("dm_blocks")
        .delete()
        .eq("blocker_user_id", userId)
        .eq("blocked_user_id", otherId)

      if (unblockError) {
        setError(unblockError.message)
        return
      }

      void loadBlocks()
    },
    [userId, supabase, loadBlocks],
  )

  const handleReport = useCallback(
    async (messageId: string) => {
      if (!userId || !reportReason.trim()) return
      setError(null)

      const { error: reportError } = await supabase.from("dm_reports").insert({
        message_id: messageId,
        reporter_user_id: userId,
        reason: reportReason.trim(),
      })

      if (reportError) {
        setError(reportError.message)
        return
      }

      setReportingMessageId(null)
      setReportReason("")
    },
    [userId, reportReason, supabase],
  )

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId)
  const selectedOtherId = selectedConversation ? otherParticipantId(selectedConversation) : null
  const selectedIsBlocked = selectedOtherId !== null ? isBlocked(selectedOtherId) : false
  const selectedBlockedByOther =
    selectedOtherId !== null ? isBlockedByOther(selectedOtherId) : false

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-12 z-30 border-b border-border bg-[var(--surface)] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Mensagens</h1>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 px-4 py-4">
        {loading && (
          <p className="w-full py-12 text-center text-sm text-muted">Carregando conversas...</p>
        )}

        {error && (
          <div className="mb-4 w-full rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="w-full py-12 text-center">
            <p className="text-sm text-muted">
              Nenhuma conversa ainda. Suas mensagens aparecerao aqui quando voce interagir em
              grupos, eventos, recomendacoes ou com familiares.
            </p>
          </div>
        )}

        {!loading && conversations.length > 0 && (
          <div className="flex w-full gap-4">
            {/* Conversation list */}
            <div className="w-64 shrink-0 space-y-1 border-r border-border pr-4">
              {conversations.map((conversation) => {
                const otherId = otherParticipantId(conversation)
                if (!otherId) return null
                const blocked = isBlocked(otherId)
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selectedConversationId === conversation.id
                        ? "bg-[color-mix(in_oklch,var(--foreground)_10%,transparent)]"
                        : "hover:bg-[color-mix(in_oklch,var(--foreground)_4%,transparent)]"
                    }`}
                  >
                    <div className="truncate font-medium">{otherId?.slice(0, 8)}...</div>
                    <div className="text-xs text-muted">
                      {CONTEXT_LABELS[conversation.context_type] ?? conversation.context_type}
                    </div>
                    {blocked && <div className="text-xs text-red-500">Bloqueado</div>}
                  </button>
                )
              })}
            </div>

            {/* Message area */}
            <div className="flex flex-1 flex-col">
              {!selectedConversation ? (
                <p className="py-12 text-center text-sm text-muted">
                  Selecione uma conversa para ver as mensagens
                </p>
              ) : (
                <>
                  {/* Conversation header */}
                  <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <span className="text-sm font-medium">
                        Conversa via{" "}
                        {CONTEXT_LABELS[selectedConversation.context_type] ??
                          selectedConversation.context_type}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {selectedOtherId &&
                        (selectedIsBlocked ? (
                          selectedBlockedByOther ? (
                            <span className="text-xs text-red-500">Voce foi bloqueado</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onPress={() => handleUnblock(selectedOtherId)}
                            >
                              Desbloquear
                            </Button>
                          )
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onPress={() => handleBlock(selectedOtherId)}
                          >
                            Bloquear
                          </Button>
                        ))}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {messages.length === 0 && (
                      <p className="py-6 text-center text-sm text-muted">
                        Nenhuma mensagem ainda. Envie a primeira!
                      </p>
                    )}

                    {messages.map((message) => {
                      const isOwn = message.sender_id === userId
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                              isOwn
                                ? "text-[var(--accent-foreground)]"
                                : "bg-[color-mix(in_oklch,var(--foreground)_6%,transparent)]"
                            }`}
                            style={
                              isOwn
                                ? {
                                    backgroundColor: brandTokens.color.accent,
                                    color: brandTokens.color.accentForeground,
                                  }
                                : undefined
                            }
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <span className="text-xs opacity-60">
                                {new Date(message.created_at).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {!isOwn && reportingMessageId !== message.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReportingMessageId(message.id)
                                    setReportReason("")
                                  }}
                                  className="text-xs text-muted hover:text-red-500"
                                >
                                  Denunciar
                                </button>
                              )}
                            </div>

                            {reportingMessageId === message.id && (
                              <div className="mt-2 space-y-1 border-t border-border pt-2">
                                <TextArea
                                  placeholder="Motivo da denuncia (min. 10 caracteres)"
                                  value={reportReason}
                                  onChange={(e) =>
                                    setReportReason((e.target as HTMLTextAreaElement).value)
                                  }
                                  className="text-xs"
                                />
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    onPress={() => handleReport(message.id)}
                                    isDisabled={reportReason.trim().length < 10}
                                    style={{
                                      backgroundColor: brandTokens.color.accent,
                                      color: brandTokens.color.accentForeground,
                                    }}
                                  >
                                    Enviar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onPress={() => setReportingMessageId(null)}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Message input */}
                  {!selectedBlockedByOther && (
                    <Form
                      className="mt-3 flex gap-2 border-t border-border pt-3"
                      onSubmit={(e) => {
                        e.preventDefault()
                        void handleSendMessage()
                      }}
                    >
                      <Input
                        placeholder="Digite sua mensagem..."
                        value={newMessage}
                        onChange={(e) => setNewMessage((e.target as HTMLInputElement).value)}
                        className="flex-1"
                        maxLength={2000}
                        disabled={selectedIsBlocked}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        isDisabled={!newMessage.trim() || selectedIsBlocked}
                        style={{
                          backgroundColor: brandTokens.color.accent,
                          color: brandTokens.color.accentForeground,
                        }}
                      >
                        Enviar
                      </Button>
                    </Form>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
