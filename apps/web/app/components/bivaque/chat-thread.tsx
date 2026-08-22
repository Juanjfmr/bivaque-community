"use client"

import { scrubReportReason } from "@bivaque/domain"
import { Button, TextArea } from "@heroui/react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Database } from "supabase/database.generated"
import { FeedbackAlert } from "./feedback-alert"
import { MessageAreaSkeleton } from "./skeleton"

type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

const CONTEXT_LABELS: Record<string, string> = {
  shared_group: "Grupo em comum",
  shared_event: "Evento em comum",
  recommendation_thread: "Recomendação",
  accepted_family: "Família",
}

interface ChatThreadProps {
  supabase: SupabaseClient<Database>
  conversationId: string
  userId: string
  otherDisplayName: string
  contextType: string
  isBlockedByOther: boolean
  isBlocked: boolean
  onBlock: (otherId: string) => void
  onUnblock: (otherId: string) => void
  onBack: () => void
  isMobile: boolean
}

export function ChatThread({
  supabase,
  conversationId,
  userId,
  otherDisplayName,
  contextType,
  isBlockedByOther,
  isBlocked,
  onBlock,
  onUnblock,
  onBack,
  isMobile,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [msgError, setMsgError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState("")
  const [reportError, setReportError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" })
  }, [])

  const loadMessages = useCallback(async () => {
    setLoadingMessages(true)
    setMsgError(null)

    const { data, error } = await supabase
      .from("dm_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) {
      setMsgError(error.message)
      setLoadingMessages(false)
      return
    }

    setMessages((data as MessageRow[]) ?? [])
    setLoadingMessages(false)
  }, [supabase, conversationId])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!loadingMessages && messages.length > 0) {
      scrollToBottom()
    }
  }, [loadingMessages, messages.length, scrollToBottom])

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || sending || isBlockedByOther || isBlocked) return

    setSendError(null)
    setSending(true)
    const content = newMessage.trim()

    const optimisticId = `opt_${Date.now()}`
    const optimisticMsg: MessageRow = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: userId,
      content,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, optimisticMsg])
    setNewMessage("")

    requestAnimationFrame(() => scrollToBottom(true))

    const { error } = await supabase.from("dm_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content,
    })

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      setSendError(
        error.message.includes("blocked")
          ? "Não é possível enviar: conversa bloqueada ou não autorizada."
          : error.message.includes("pii")
            ? "Mensagem bloqueada: não compartilhe dados pessoais."
            : error.message,
      )
      setSending(false)
      return
    }

    setSending(false)
    void loadMessages()
  }, [
    newMessage,
    sending,
    isBlockedByOther,
    isBlocked,
    supabase,
    conversationId,
    userId,
    loadMessages,
    scrollToBottom,
  ])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend],
  )

  const handleReport = useCallback(
    async (messageId: string) => {
      if (!reportReason.trim() || reportReason.trim().length < 10) return
      setReportError(null)

      // H-Task 1 (F162): a denuncia de mensagem passa a viver em `reports`,
      // que e a tabela que o painel do operador le. `dm_reports` era uma fila
      // separada, sem `status`, que nenhum painel consultava — assedio em canal
      // privado gerava registro e nada acontecia. `report_target_type` ja tinha
      // 'message' desde 20260802001600; nunca foi usado.
      //
      // Ganha de graca o que a tabela nova tem e a antiga nao tinha: status,
      // bloqueio de auto-denuncia (20260821000032), bloqueio de duplicata pelo
      // indice parcial, redacao de documento no motivo (20260821000030) e um
      // painel que le.
      const { error } = await supabase.from("reports").insert({
        target_type: "message",
        target_id: messageId,
        reporter_user_id: userId,
        reason: scrubReportReason(reportReason.trim()),
      })

      if (error) {
        if (error.code === "23505") {
          setReportError("Voce ja denunciou esta mensagem.")
        } else if (error.message.includes("own content")) {
          setReportError("Voce nao pode denunciar a propria mensagem.")
        } else {
          setReportError(error.message)
        }
        return
      }

      setReportingMessageId(null)
      setReportReason("")
    },
    [reportReason, supabase, userId],
  )

  const contextLabel = CONTEXT_LABELS[contextType] ?? contextType

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
        {isMobile && (
          <button
            type="button"
            onClick={onBack}
            className="motion-press mr-1 flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-[var(--surface-subtle)]"
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
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">{otherDisplayName}</p>
          <p className="truncate text-xs text-muted">{contextLabel}</p>
        </div>
        {isBlockedByOther ? (
          <span className="text-xs text-[var(--danger)]">Você foi bloqueado</span>
        ) : isBlocked ? (
          <Button size="sm" variant="ghost" onPress={() => onUnblock(conversationId)}>
            Desbloquear
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onPress={() => onBlock(conversationId)}>
            Bloquear
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loadingMessages && <MessageAreaSkeleton />}

        {msgError && (
          <div className="py-8">
            <FeedbackAlert
              variant="danger"
              title="Erro ao carregar mensagens"
              description={msgError}
              actions={
                <Button size="sm" variant="tertiary" onPress={() => loadMessages()}>
                  Tentar novamente
                </Button>
              }
            />
          </div>
        )}

        {!loadingMessages && !msgError && messages.length === 0 && (
          <p className="py-12 text-center text-sm text-muted">
            Nenhuma mensagem ainda. Envie a primeira!
          </p>
        )}

        {!loadingMessages &&
          messages.map((msg) => {
            const isOwn = msg.sender_id === userId
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isOwn
                      ? "rounded-br-md bg-[var(--accent)] text-[var(--accent-foreground)]"
                      : "rounded-bl-md bg-[var(--surface-subtle)]"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="select-none text-[0.65rem] opacity-60">
                      {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {!isOwn && reportingMessageId !== msg.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setReportingMessageId(msg.id)
                          setReportReason("")
                          setReportError(null)
                        }}
                        className="motion-press text-[0.65rem] text-muted transition-colors hover:text-[var(--danger)]"
                      >
                        Denunciar
                      </button>
                    )}
                  </div>

                  {reportingMessageId === msg.id && (
                    <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                      <TextArea
                        placeholder="Motivo da denúncia (mín. 10 caracteres)"
                        value={reportReason}
                        onChange={(e) => setReportReason((e.target as HTMLTextAreaElement).value)}
                        className="text-xs"
                      />
                      {reportError && <p className="text-xs text-[var(--danger)]">{reportError}</p>}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={() => handleReport(msg.id)}
                          isDisabled={reportReason.trim().length < 10}
                        >
                          Enviar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={() => {
                            setReportingMessageId(null)
                            setReportError(null)
                          }}
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

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {sendError && (
        <div className="mx-3 mb-1">
          <FeedbackAlert variant="danger" description={sendError} />
        </div>
      )}

      <div className="shrink-0 border-t border-border px-3 py-2.5">
        {isBlockedByOther ? (
          <p className="py-2 text-center text-xs text-muted">
            Você não pode enviar mensagens porque foi bloqueado.
          </p>
        ) : isBlocked ? (
          <p className="py-2 text-center text-xs text-muted">Desbloqueie para enviar mensagens.</p>
        ) : (
          <div className="flex items-end gap-2">
            <TextArea
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage((e.target as HTMLTextAreaElement).value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              maxLength={2000}
              rows={2}
            />
            <div className="flex items-center gap-1 text-xs text-muted self-end pb-1">
              {newMessage.length > 1800 && (
                <span className={newMessage.length >= 2000 ? "text-[var(--danger)]" : ""}>
                  {2000 - newMessage.length}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="primary"
              onPress={() => handleSend()}
              isDisabled={!newMessage.trim() || sending}
            >
              {sending ? "..." : "Enviar"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Format a brief last-message preview from a ConversationRow + optional lastMessage. */
export function formatLastMessagePreview(
  lastMsg: { content: string; sender_id: string } | null,
  userId: string,
): string {
  if (!lastMsg) return ""
  const prefix = lastMsg.sender_id === userId ? "Você: " : ""
  const truncated =
    lastMsg.content.length > 60 ? `${lastMsg.content.slice(0, 60)}…` : lastMsg.content
  return `${prefix}${truncated}`
}

export { CONTEXT_LABELS }
