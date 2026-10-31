"use client"

import { scrubReportReason } from "@bivaque/domain"
import type { SupabaseClient } from "@supabase/supabase-js"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Database } from "supabase/database.generated"
import { canSubmitReply } from "../../(shell)/messages/conversas-loaders"
import styles from "./chat-thread.module.css"
import { FeedbackAlert } from "./feedback-alert"
import { formatRelativeTime, sendFailureLabel, type ThreadMessage } from "./message-delivery"
import { MessageAreaSkeleton } from "./skeleton"

// FIGMA-001 — fio de mensagens e campo de resposta na geometria das pranchas
// 221:43432 e 221:43842. O mecanismo de entrega é o existente (RECON-015):
// linha otimista "sending", promoção para a linha devolvida pelo insert em
// "sent", e em falha a mensagem PERMANECE na tela como "não enviada" com nova
// tentativa — o rascunho nunca se perde no retry. O guarda canSubmitReply
// impede submit duplicado enquanto há entrega pendente.

interface ReportReasonFieldProps {
  id: string
  describedBy: string
  errorId: string
  errored: boolean
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}

// O foco do campo de denúncia entra por efeito, não pelo atributo DOM
// `autoFocus` (proibido pelo lint de a11y da casa): a prop declara a intenção
// e o efeito aplica uma única vez ao montar o disclosure.
function ReportReasonField({
  id,
  describedBy,
  errorId,
  errored,
  value,
  onChange,
  autoFocus = false,
}: ReportReasonFieldProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])
  return (
    <textarea
      ref={ref}
      id={id}
      className={styles["reportTextArea"]}
      placeholder="Motivo da denúncia (mín. 10 caracteres)"
      aria-describedby={describedBy}
      aria-errormessage={errored ? errorId : undefined}
      aria-invalid={errored}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

interface ChatThreadProps {
  supabase: SupabaseClient<Database>
  conversationId: string
  userId: string
  /** Volta para a caixa do shell atual: /messages (membro) ou /prestador/conversas (dono da ficha). */
  backHref?: string
  otherDisplayName: string
  contextLabel: string
  contextTitle: string | null
  originHref: string | null
  isBlockedByOther: boolean
  isBlocked: boolean
  onBlock: () => void
  onUnblock: () => void
}

export function ChatThread({
  supabase,
  conversationId,
  userId,
  backHref = "/messages",
  otherDisplayName,
  contextLabel,
  contextTitle,
  originHref,
  isBlockedByOther,
  isBlocked,
  onBlock,
  onUnblock,
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

  // otherDisplayName vem da consulta autorizada (RPC conversation_counterpart_name
  // ou profiles). Sem nome resolvido, o rótulo honesto é "Participante".
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
      // Erro cru do PostgREST nunca vai para a tela: mensagem segura com
      // nova tentativa (revisão independente GLM, 05/10/2026).
      setMsgError(
        "Não foi possível carregar as mensagens agora. Verifique sua conexão e tente novamente.",
      )
      setLoadingMessages(false)
      return
    }

    // Linha que veio do servidor já está confirmada por definição.
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
    if (!canSubmitReply(content, messages) || isBlockedByOther || isBlocked) return

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
    messages,
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

      // A denúncia de mensagem vive em `reports` (H-Task 1 / F162): é a tabela
      // que o painel do operador lê, com status, bloqueio de auto-denúncia e
      // de duplicata e redação de documento no motivo.
      const { error } = await supabase.from("reports").insert({
        target_type: "message",
        target_id: messageId,
        reporter_user_id: userId,
        reason: scrubReportReason(reportReason.trim()),
      })

      if (error) {
        // Reparos finais FIGMA-001 (06/10/2026): avisos em pt-BR acentuado — o
        // e2e reports-member-flow.spec.ts foi reconciliado no mesmo ato.
        if (error.code === "23505") {
          setReportError("Você já denunciou esta mensagem.")
        } else if (error.message.includes("own content")) {
          setReportError("Você não pode denunciar a própria mensagem.")
        } else {
          setReportError("Não foi possível enviar a denúncia agora. Tente novamente em instantes.")
        }
        return
      }

      closeReport()
      setReportReason("")
    },
    [closeReport, reportReason, supabase, userId],
  )

  const sendEnabled = canSubmitReply(newMessage, messages) && !isBlockedByOther && !isBlocked

  return (
    <>
      <div className={styles["threadView"]}>
        <a href={backHref} className={styles["backButton"]}>
          ← Conversas
        </a>

        <h1 className={styles["heading"]}>{resolvedOtherName}</h1>
        <p className={styles["contextLabel"]}>{contextLabel}</p>

        {(contextTitle !== null || originHref !== null || !isBlockedByOther) && (
          <div className={styles["contextCard"]}>
            {contextTitle !== null && <p className={styles["contextTitle"]}>{contextTitle}</p>}
            <div className={styles["contextActions"]}>
              {originHref !== null && (
                <a href={originHref} className={styles["contextButton"]}>
                  Ver origem
                </a>
              )}
              {isBlockedByOther ? (
                <span className={styles["blockedNote"]}>Você foi bloqueado nesta conversa.</span>
              ) : isBlocked ? (
                <button type="button" className={styles["contextButton"]} onClick={onUnblock}>
                  Desbloquear
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles["contextButton"]} ${styles["contextButtonDanger"]}`}
                  onClick={onBlock}
                >
                  Bloquear
                </button>
              )}
            </div>
          </div>
        )}

        <div className={styles["messages"]}>
          {loadingMessages && <MessageAreaSkeleton />}

          {msgError && (
            <div className={styles["stateBlock"]}>
              <FeedbackAlert
                variant="danger"
                title="Erro ao carregar mensagens"
                description={msgError}
                actions={
                  <button
                    type="button"
                    className={styles["retryButton"]}
                    onClick={() => loadMessages()}
                  >
                    Tentar novamente
                  </button>
                }
              />
            </div>
          )}

          {!loadingMessages && !msgError && messages.length === 0 && (
            <p className={styles["contextLabel"]}>Nenhuma mensagem ainda. Envie a primeira!</p>
          )}

          {!loadingMessages &&
            messages.map((msg) => {
              const isOwn = msg.sender_id === userId
              const authorName = isOwn ? "Você" : resolvedOtherName
              const statusLabel =
                msg.status === "sending"
                  ? "enviando…"
                  : msg.status === "failed"
                    ? "não enviada"
                    : "enviado"
              return (
                <div
                  key={msg.id}
                  className={`${styles["messageCard"]} ${isOwn ? styles["messageCardOwn"] : ""} ${
                    msg.status === "failed" ? styles["messageCardFailed"] : ""
                  }`}
                >
                  <p className={styles["messageHeader"]}>
                    <span>{isOwn ? `Você · ${statusLabel}` : authorName}</span>
                    <span className={styles["messageTime"]}>
                      {formatRelativeTime(msg.created_at)}
                    </span>
                  </p>
                  <p className={styles["messageBody"]}>{msg.content}</p>

                  {isOwn && (
                    <div className={styles["deliveryRow"]} role="status">
                      {msg.status === "sending" && (
                        <span className={styles["deliveryLabel"]}>Enviando…</span>
                      )}
                      {msg.status === "sent" && (
                        <span className={styles["deliveryLabel"]}>Enviado</span>
                      )}
                      {msg.status === "failed" && (
                        <>
                          <span
                            className={`${styles["deliveryLabel"]} ${styles["deliveryLabelFailed"]}`}
                          >
                            Não enviado{msg.failure ? `: ${msg.failure}` : ""}
                          </span>
                          <button
                            type="button"
                            className={styles["retryButton"]}
                            onClick={() => handleRetry(msg.id)}
                          >
                            Tentar novamente
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {!isOwn && msg.status === "sent" && (
                    <>
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
                        className={`${styles["reportTrigger"]} min-h-11 min-w-11`}
                        aria-expanded={reportingMessageId === msg.id}
                        aria-controls={`message-report-${msg.id}`}
                      >
                        {/* Nome acessível ESTÁVEL, estado em aria-expanded
                            (padrão de disclosure; WCAG 2.5.3). */}
                        Denunciar
                      </button>

                      {reportingMessageId === msg.id && (
                        <div id={`message-report-${msg.id}`} className={styles["reportBox"]}>
                          <label
                            className={styles["reportLabel"]}
                            htmlFor={`report-reason-${msg.id}`}
                          >
                            Motivo da denúncia
                          </label>
                          <ReportReasonField
                            autoFocus
                            id={`report-reason-${msg.id}`}
                            describedBy={`report-privacy-${msg.id}${reportError ? ` report-error-${msg.id}` : ""}`}
                            errorId={`report-error-${msg.id}`}
                            errored={Boolean(reportError)}
                            value={reportReason}
                            onChange={setReportReason}
                          />
                          <p
                            id={`report-privacy-${msg.id}`}
                            className={styles["reportNote"]}
                            role="note"
                          >
                            Não inclua CPF, telefone ou endereço. O motivo é redigido antes da
                            análise.
                          </p>
                          {reportError && (
                            <div id={`report-error-${msg.id}`}>
                              <FeedbackAlert variant="danger" description={reportError} />
                            </div>
                          )}
                          <div className={styles["reportActions"]}>
                            <button
                              type="button"
                              className={styles["sendButton"]}
                              onClick={() => handleReport(msg.id)}
                              disabled={reportReason.trim().length < 10}
                            >
                              Enviar
                            </button>
                            <button
                              type="button"
                              className={styles["cancelButton"]}
                              onClick={() => closeReport()}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer (221:43842) */}
      <div className={styles["composer"]}>
        {isBlockedByOther ? (
          <p className={styles["blockedNote"]}>
            Você não pode enviar mensagens porque foi bloqueado.
          </p>
        ) : isBlocked ? (
          <p className={styles["blockedNote"]}>Desbloqueie para enviar mensagens.</p>
        ) : (
          <>
            <textarea
              className={styles["composerField"]}
              placeholder="Escreva sua resposta…"
              aria-label="Escreva sua resposta"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={2000}
              rows={2}
            />
            <div className={styles["composerActions"]}>
              <button
                type="button"
                className={styles["sendButton"]}
                onClick={handleSend}
                disabled={!sendEnabled}
                data-testid="conversa-enviar"
              >
                Enviar
              </button>
              <button
                type="button"
                className={styles["cancelButton"]}
                onClick={() => setNewMessage("")}
                disabled={newMessage.length === 0}
              >
                Cancelar
              </button>
            </div>
            <p className={styles["composerNote"]}>
              Somente os participantes desta conversa veem as mensagens.
            </p>
          </>
        )}
      </div>
    </>
  )
}
