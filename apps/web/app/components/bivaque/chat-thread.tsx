"use client"

import { scrubReportReason } from "@bivaque/domain"
import { Button, TextArea } from "@heroui/react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Database } from "supabase/database.generated"
import { MemberAvatar } from "./avatar"
import { FeedbackAlert } from "./feedback-alert"
import { formatRelativeTime, sendFailureLabel, type ThreadMessage } from "./message-delivery"
import { MessageAreaSkeleton } from "./skeleton"

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
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [msgError, setMsgError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState("")
  const [reportError, setReportError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const reportTriggerRefs = useRef(new Map<string, HTMLButtonElement>())

  // otherDisplayName vem da consulta de profiles na pagina consumidora.
  // Sem nome resolvido, o rotulo honesto e "Participante" — nunca nome chumbado.
  const resolvedOtherName = otherDisplayName?.trim() || "Participante"

  const closeReport = useCallback(() => {
    const messageId = reportingMessageId
    setReportingMessageId(null)
    setReportError(null)
    if (messageId) requestAnimationFrame(() => reportTriggerRefs.current.get(messageId)?.focus())
  }, [reportingMessageId])

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

    // Linha que veio do servidor ja esta confirmada por definicao.
    setMessages((data ?? []).map((m) => ({ ...m, status: "sent", failure: null })))
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

  // Insere no servidor e so entao promove a mensagem a "sent", trocando a
  // linha otimista pela linha real devolvida pelo insert. Em falha a mensagem
  // fica na tela marcada como nao enviada e conserva o conteudo para tentativa.
  const deliverMessage = useCallback(
    async (messageId: string, content: string) => {
      const { data, error } = await supabase
        .from("dm_messages")
        .insert({ conversation_id: conversationId, sender_id: userId, content })
        .select()
        .single()

      if (error || !data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, status: "failed", failure: sendFailureLabel(error?.message) }
              : m,
          ),
        )
        return
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...data, status: "sent", failure: null } : m)),
      )
    },
    [supabase, conversationId, userId],
  )

  const handleSend = useCallback(() => {
    const content = newMessage.trim()
    if (!content || isBlockedByOther || isBlocked) return

    const optimistic: ThreadMessage = {
      id: `opt-${crypto.randomUUID()}`,
      conversation_id: conversationId,
      sender_id: userId,
      content,
      created_at: new Date().toISOString(),
      status: "sending",
      failure: null,
    }

    setMessages((prev) => [...prev, optimistic])
    setNewMessage("")
    requestAnimationFrame(() => scrollToBottom(true))
    void deliverMessage(optimistic.id, content)
  }, [
    newMessage,
    isBlockedByOther,
    isBlocked,
    conversationId,
    userId,
    deliverMessage,
    scrollToBottom,
  ])

  const handleRetry = useCallback(
    (messageId: string) => {
      const target = messages.find((m) => m.id === messageId)
      if (target?.status !== "failed") return
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: "sending", failure: null } : m)),
      )
      void deliverMessage(messageId, target.content)
    },
    [messages, deliverMessage],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
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
      // 'message' desde 20260802001600; nunca foi usado. A tabela antiga foi
      // removida por 20260825175718 (copias migraram para `reports`).
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
          setReportError("Nao foi possivel enviar a denuncia agora. Tente novamente em instantes.")
        }
        return
      }

      closeReport()
      setReportReason("")
    },
    [closeReport, reportReason, supabase, userId],
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
            className="motion-press mr-1 flex h-11 w-11 items-center justify-center rounded-md text-muted hover:bg-[var(--semantic-selected)]"
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
          <p className="truncate text-sm font-medium">{resolvedOtherName}</p>
          <p className="truncate text-xs text-muted">{contextLabel}</p>
        </div>
        {isBlockedByOther ? (
          <span className="text-xs text-[var(--semantic-danger)]">Você foi bloqueado</span>
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

      {/* Messages area — composicao da prancha 15: autor, hora e corpo por linha */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
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
            const authorName = isOwn ? "Você" : resolvedOtherName
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}>
                <MemberAvatar name={authorName} size="sm" className="mt-5 shrink-0" />
                <div
                  className={`flex min-w-0 max-w-[80%] flex-col ${isOwn ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{authorName}</span>
                    <span className="text-xs text-muted">{formatRelativeTime(msg.created_at)}</span>
                  </div>

                  <div
                    className={`mt-1 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.status === "failed"
                        ? "border border-[var(--semantic-danger)] bg-[var(--semantic-surface-sunken)]"
                        : isOwn
                          ? `rounded-br-md bg-[var(--semantic-action-primary)] text-[var(--semantic-action-on-strong)] ${
                              msg.status === "sending" ? "opacity-75" : ""
                            }`
                          : "rounded-bl-md bg-[var(--semantic-selected)]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>

                  {/* Estado de entrega: enviando / enviado / falhou — nunca tique de leitura inventado */}
                  {isOwn && (
                    <div className="mt-0.5 flex min-h-6 flex-wrap items-center gap-2" role="status">
                      {msg.status === "sending" && (
                        <span className="text-xs text-[var(--semantic-text-secondary)]">
                          Enviando…
                        </span>
                      )}
                      {msg.status === "sent" && (
                        <span className="text-xs text-[var(--semantic-text-secondary)]">
                          Enviado
                        </span>
                      )}
                      {msg.status === "failed" && (
                        <>
                          <span className="text-xs font-medium text-[var(--semantic-danger)]">
                            Não enviado
                          </span>
                          <Button
                            size="sm"
                            variant="tertiary"
                            className="min-h-11"
                            onPress={() => handleRetry(msg.id)}
                          >
                            Tentar novamente
                          </Button>
                          {msg.failure && (
                            <span className="text-xs text-[var(--semantic-danger)]">
                              {msg.failure}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {!isOwn && msg.status === "sent" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (reportingMessageId === msg.id) {
                          closeReport()
                        } else {
                          setReportingMessageId(msg.id)
                          setReportReason("")
                          setReportError(null)
                        }
                      }}
                      ref={(node) => {
                        if (node) reportTriggerRefs.current.set(msg.id, node)
                        else reportTriggerRefs.current.delete(msg.id)
                      }}
                      className="motion-press min-h-11 min-w-11 px-2 text-sm text-muted transition-colors hover:text-[var(--semantic-danger)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus-outer)]"
                      aria-expanded={reportingMessageId === msg.id}
                      aria-controls={`message-report-${msg.id}`}
                    >
                      {reportingMessageId === msg.id ? "Fechar denúncia" : "Denunciar"}
                    </button>
                  )}

                  {reportingMessageId === msg.id && (
                    <div
                      id={`message-report-${msg.id}`}
                      className="mt-1 w-full max-w-full space-y-1.5 border-t border-border pt-2"
                    >
                      <label
                        className="block text-sm font-medium"
                        htmlFor={`report-reason-${msg.id}`}
                      >
                        Motivo da denúncia
                      </label>
                      <TextArea
                        id={`report-reason-${msg.id}`}
                        placeholder="Motivo da denúncia (mín. 10 caracteres)"
                        aria-describedby={`report-privacy-${msg.id}${reportError ? ` report-error-${msg.id}` : ""}`}
                        aria-errormessage={reportError ? `report-error-${msg.id}` : undefined}
                        aria-invalid={Boolean(reportError)}
                        autoFocus
                        value={reportReason}
                        onChange={(e) => setReportReason((e.target as HTMLTextAreaElement).value)}
                        className="text-sm"
                      />
                      <p id={`report-privacy-${msg.id}`} className="text-xs text-muted" role="note">
                        Não inclua CPF, telefone ou endereço. O motivo é redigido antes da análise.
                      </p>
                      {reportError && (
                        <div id={`report-error-${msg.id}`}>
                          <FeedbackAlert variant="danger" description={reportError} />
                        </div>
                      )}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={() => handleReport(msg.id)}
                          isDisabled={reportReason.trim().length < 10}
                        >
                          Enviar
                        </Button>
                        <Button size="sm" variant="ghost" onPress={() => closeReport()}>
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
              aria-label="Digite sua mensagem"
              value={newMessage}
              onChange={(e) => setNewMessage((e.target as HTMLTextAreaElement).value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
              maxLength={2000}
              rows={2}
            />
            <div className="flex flex-col items-end gap-1 self-end pb-1">
              {newMessage.length > 1800 && (
                <span
                  className={`text-xs ${newMessage.length >= 2000 ? "text-[var(--semantic-danger)]" : "text-muted"}`}
                >
                  {2000 - newMessage.length} caracteres restantes
                </span>
              )}
              <Button
                size="sm"
                variant="primary"
                onPress={handleSend}
                isDisabled={!newMessage.trim()}
              >
                Enviar
              </Button>
            </div>
          </div>
        )}
        <p className="mt-1 text-xs text-muted">
          Somente os participantes desta conversa veem as mensagens.
        </p>
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
