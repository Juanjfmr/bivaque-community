"use client"

import { Button, TextArea } from "@heroui/react"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Info,
  MapPin,
  MessageCircle,
  Pencil,
  ShieldCheck,
} from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import {
  countUnread,
  formatRequestDate,
  formatSentLine,
  isClosedStatus,
  isUnread,
  REQUEST_STATUS_LABELS,
  type ServiceRequestStatus,
  type TrackingMessage,
  validateEditDescription,
  validateMessageContent,
} from "../../../../lib/service-requests/tracking"
import { MemberAvatar } from "../../../components/bivaque/avatar"
import { Card } from "../../../components/bivaque/card"
import { AccessUnavailableState } from "../../../components/bivaque/empty-state"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { sendFailureLabel } from "../../../components/bivaque/message-delivery"
import { closeRequest, markRequestRead, saveRequestEdit, sendRequestMessage } from "./actions"

// RECON-023 — a composicao da prancha 17 (R44). O estado do pedido vem da
// COLUNA e a conversa do registro persistido; o cliente nunca deriva situacao
// de contagem de mensagens. Envio deduplicado por `client_key`; texto
// preservado no erro; encerrar idempotente.

type WorkspaceMessage = TrackingMessage & {
  status: "sending" | "sent" | "failed"
  failure: string | null
  clientKey?: string
}

type RequestViewModel = {
  id: string
  status: ServiceRequestStatus
  description: string
  whenText: string | null
  createdAt: string
  closedAt: string | null
  closedByUserId: string | null
  providerName: string
  categoryLabel: string
  location: string | null
}

interface RequestWorkspaceProps {
  request: RequestViewModel
  conversationId: string | null
  viewerId: string
  isRequester: boolean
  initialMessages: TrackingMessage[]
  initialLastReadAt: string | null
}

export function RequestWorkspace({
  request,
  conversationId,
  viewerId,
  isRequester,
  initialMessages,
  initialLastReadAt,
}: RequestWorkspaceProps) {
  const [status, setStatus] = useState<ServiceRequestStatus>(request.status)
  const [closedAt, setClosedAt] = useState<string | null>(request.closedAt)
  const [closedByUserId, setClosedByUserId] = useState<string | null>(request.closedByUserId)
  const [description, setDescription] = useState(request.description)
  const [whenText, setWhenText] = useState(request.whenText)

  const [messages, setMessages] = useState<WorkspaceMessage[]>(
    initialMessages.map(
      (message): WorkspaceMessage => ({
        ...message,
        status: "sent",
        failure: null,
      }),
    ),
  )
  const [lastReadAt, setLastReadAt] = useState<string | null>(initialLastReadAt)

  const [newMessage, setNewMessage] = useState("")
  const [sendError, setSendError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null)

  const [confirmingClose, setConfirmingClose] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [closeNotice, setCloseNotice] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [editDescription, setEditDescription] = useState(request.description)
  const [editWhen, setEditWhen] = useState(request.whenText ?? "")
  const [editError, setEditError] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const [sessionExpired, setSessionExpired] = useState(false)

  const closed = isClosedStatus(status)

  const markRead = useCallback(async () => {
    if (!conversationId) return
    const result = await markRequestRead(conversationId)
    if (result.ok) setLastReadAt(new Date().toISOString())
  }, [conversationId])

  const deliver = useCallback(
    async (clientKey: string, content: string) => {
      if (!conversationId) {
        setSendError("Não foi possível abrir a conversa deste pedido.")
        return
      }
      setSending(true)
      setSendError(null)

      const result = await sendRequestMessage({ conversationId, content, clientKey })

      setSending(false)

      if (result.status === "session") {
        setSessionExpired(true)
        return
      }
      if (result.status === "error") {
        setMessages((prev) =>
          prev.map((message) =>
            message.clientKey === clientKey
              ? { ...message, status: "failed", failure: sendFailureLabel(result.message) }
              : message,
          ),
        )
        setNewMessage((prev) => (prev.trim().length > 0 ? prev : content))
        return
      }

      const row = result.message
      setMessages((prev) => {
        const withoutDuplicate = prev.filter((message) => message.id !== row.id)
        return withoutDuplicate.map((message) =>
          message.clientKey === clientKey
            ? { ...row, status: "sent", failure: null, clientKey }
            : message,
        )
      })
      setNewMessage("")
      void markRead()
    },
    [conversationId, markRead],
  )

  const handleSend = useCallback(() => {
    const content = newMessage.trim()
    const validation = validateMessageContent(content)
    if (!validation.ok) {
      setSendError(validation.message)
      return
    }
    if (!conversationId) {
      setSendError("Não foi possível abrir a conversa deste pedido.")
      return
    }

    const clientKey = crypto.randomUUID()
    const optimistic: WorkspaceMessage = {
      id: `opt-${clientKey}`,
      sender_id: viewerId,
      content,
      created_at: new Date().toISOString(),
      status: "sending",
      failure: null,
      clientKey,
    }
    setMessages((prev) => [...prev, optimistic])
    setNewMessage("")
    void deliver(clientKey, content)
  }, [newMessage, conversationId, viewerId, deliver])

  const handleRetry = useCallback(
    (message: WorkspaceMessage) => {
      if (message.status !== "failed" || !message.clientKey) return
      setMessages((prev) =>
        prev.map((item) =>
          item.clientKey === message.clientKey
            ? { ...item, status: "sending", failure: null }
            : item,
        ),
      )
      void deliver(message.clientKey, message.content)
    },
    [deliver],
  )

  const handleClose = useCallback(async () => {
    setClosing(true)
    setCloseError(null)
    const result = await closeRequest(request.id)
    setClosing(false)

    if (result.status === "session") {
      setSessionExpired(true)
      return
    }
    if (result.status === "error") {
      setCloseError("Não foi possível encerrar agora. Tente novamente.")
      return
    }

    setStatus(result.requestStatus)
    setClosedAt(result.closedAt)
    setClosedByUserId(result.closedByUserId)
    setConfirmingClose(false)
    if (result.closedByUserId && result.closedByUserId !== viewerId) {
      setCloseNotice("O pedido já havia sido encerrado por outra pessoa.")
    }
  }, [request.id, viewerId])

  const handleSaveEdit = useCallback(async () => {
    const validation = validateEditDescription(editDescription)
    if (!validation.ok) {
      setEditError(validation.message)
      return
    }
    setSavingEdit(true)
    setEditError(null)
    const result = await saveRequestEdit({
      requestId: request.id,
      description: editDescription,
      whenText: editWhen,
    })
    setSavingEdit(false)

    if (result.status === "session") {
      setSessionExpired(true)
      return
    }
    if (result.status === "error") {
      setEditError("Não foi possível salvar agora. Seu texto continua aqui.")
      return
    }

    setDescription(result.description)
    setWhenText(result.whenText)
    setEditing(false)
  }, [request.id, editDescription, editWhen])

  const responses = useMemo(
    () => messages.filter((message) => message.sender_id !== viewerId),
    [messages, viewerId],
  )
  const unreadCount = countUnread(responses, viewerId, lastReadAt)
  const title =
    description.split(/\r?\n/).find((line) => line.trim().length > 0) ?? request.categoryLabel

  const closeActorIsOther = closedByUserId !== null && closedByUserId !== viewerId

  if (sessionExpired) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <AccessUnavailableState
          title="Sessão expirada"
          description="Entre novamente para continuar acompanhando este pedido."
          primaryAction={
            <Link
              href={"/login" as Route}
              className="motion-press inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-action-on-strong)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:opacity-90"
            >
              Entrar novamente
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-8">
      <Link
        href={"/pedidos" as Route}
        className="motion-press inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:text-foreground"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Voltar aos meus pedidos
      </Link>

      <nav aria-label="Trilha do pedido" className="mt-3">
        <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
          <li>
            <Link
              href={"/explorar" as Route}
              className="motion-press inline-flex min-h-11 items-center px-1 transition-colors duration-[var(--semantic-motion-duration-instant)] hover:text-foreground"
            >
              Mercado
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={"/explorar/servicos" as Route}
              className="motion-press inline-flex min-h-11 items-center px-1 transition-colors duration-[var(--semantic-motion-duration-instant)] hover:text-foreground"
            >
              Serviços
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/pedidos/${request.id}` as Route}
              aria-current="page"
              className="motion-press inline-flex min-h-11 items-center px-1 font-medium text-foreground"
            >
              Meu pedido
            </Link>
          </li>
        </ol>
      </nav>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <span
            className={`inline-flex w-fit min-h-7 items-center rounded-full px-2.5 text-xs font-medium ${
              closed
                ? "bg-[var(--semantic-surface-sunken)] text-[var(--semantic-text-secondary)]"
                : status === "in_conversation"
                  ? "bg-[var(--semantic-info-surface)] text-[var(--semantic-info-text)]"
                  : "bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]"
            }`}
          >
            {REQUEST_STATUS_LABELS[status]}
          </span>
        </div>

        {!closed ? (
          <div className="flex flex-col items-end gap-2">
            {confirmingClose ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">Encerrar este pedido?</span>
                <Button
                  variant="primary"
                  className="min-h-11"
                  isDisabled={closing}
                  onPress={() => void handleClose()}
                >
                  {closing ? "Encerrando…" : "Confirmar"}
                </Button>
                <Button
                  variant="ghost"
                  className="min-h-11"
                  onPress={() => setConfirmingClose(false)}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button
                variant="primary"
                className="min-h-11"
                isDisabled={closing}
                onPress={() => setConfirmingClose(true)}
              >
                Encerrar pedido
              </Button>
            )}
            {closeError ? (
              <FeedbackAlert variant="danger" description={closeError} className="max-w-sm" />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted">
            {closeActorIsOther ? "Encerrado por outra pessoa" : "Encerrado"}
            {closedAt ? ` em ${formatRequestDate(closedAt)}` : ""}
          </p>
        )}
      </header>

      {closeNotice ? (
        <div className="mt-3">
          <FeedbackAlert variant="info" description={closeNotice} />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted">
        {request.location ? (
          <span className="flex min-h-6 items-center gap-1.5">
            <MapPin size={16} aria-hidden="true" />
            {request.location}
          </span>
        ) : null}
        <span className="flex min-h-6 items-center gap-1.5">
          <Calendar size={16} aria-hidden="true" />
          {whenText ?? "A combinar"}
        </span>
        <span className="flex min-h-6 items-center gap-1.5">
          <Clock size={16} aria-hidden="true" />
          {formatSentLine(request.createdAt)}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,19rem)]">
        <section aria-labelledby="respostas-titulo" className="order-2 md:order-1">
          <Card className="h-full border border-border">
            <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
              <h2 id="respostas-titulo" className="text-sm font-semibold">
                Respostas
              </h2>
              <span className="text-xs text-muted">
                {responses.length === 1 ? "1 resposta" : `${responses.length} respostas`}
              </span>
            </div>
            <ul className="flex flex-col gap-1 px-2 pb-3">
              {responses.length === 0 ? (
                <li className="px-2 py-4 text-sm text-muted">Ainda sem resposta.</li>
              ) : (
                responses.map((response) => {
                  const unread = isUnread(response, viewerId, lastReadAt)
                  const selected = selectedResponseId === response.id
                  return (
                    <li key={response.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedResponseId(response.id)
                          void markRead()
                        }}
                        aria-current={selected ? "true" : undefined}
                        className={`motion-press flex w-full min-h-11 items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-[var(--semantic-motion-duration-instant)] ${
                          selected
                            ? "bg-[var(--semantic-surface-sunken)]"
                            : "hover:bg-[var(--semantic-surface-sunken)]"
                        }`}
                      >
                        <MemberAvatar
                          name={request.providerName}
                          size="sm"
                          className="mt-0.5 shrink-0"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {request.providerName}
                            </span>
                            {unread ? (
                              <span
                                role="img"
                                aria-label="Resposta não lida"
                                className="h-2 w-2 shrink-0 rounded-full bg-[var(--semantic-action-primary)]"
                              />
                            ) : null}
                            <span className="ml-auto shrink-0 text-xs text-muted">
                              {formatRequestDate(response.created_at)}
                            </span>
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-xs text-muted">
                            {response.content}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </Card>
        </section>

        <section aria-labelledby="conversa-titulo" className="order-1 md:order-2">
          <Card className="flex h-full flex-col border border-border">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <MemberAvatar name={request.providerName} size="sm" />
              <div className="min-w-0 flex-1">
                <h2 id="conversa-titulo" className="truncate text-sm font-semibold">
                  {request.providerName}
                </h2>
              </div>
              <span className="rounded-full bg-[var(--semantic-selected)] px-2.5 py-1 text-xs font-medium text-[var(--semantic-action-primary)]">
                {request.categoryLabel}
              </span>
            </div>

            <div className="flex min-h-48 flex-col gap-3 overflow-y-auto px-4 py-3">
              {messages.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">
                  Nenhuma mensagem ainda. Escreva a primeira.
                </p>
              ) : (
                messages.map((message) => {
                  const isOwn = message.sender_id === viewerId
                  const authorName = isOwn ? "Você" : request.providerName
                  const selected = selectedResponseId === message.id
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""} ${
                        selected ? "rounded-xl bg-[var(--semantic-surface-sunken)]" : ""
                      }`}
                    >
                      <MemberAvatar name={authorName} size="sm" className="mt-4 shrink-0" />
                      <div
                        className={`flex min-w-0 max-w-[85%] flex-col ${isOwn ? "items-end" : "items-start"}`}
                      >
                        <span className="flex items-baseline gap-2">
                          <span className="text-sm font-medium">
                            {isOwn ? "Você" : request.providerName}
                          </span>
                          <span className="text-xs text-muted">
                            {formatRequestDate(message.created_at)}
                          </span>
                        </span>
                        <span
                          className={`mt-1 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            message.status === "failed"
                              ? "border border-[var(--semantic-danger)] bg-[var(--semantic-surface-sunken)]"
                              : isOwn
                                ? "rounded-br-md bg-[var(--semantic-action-primary)] text-[var(--semantic-action-on-strong)]"
                                : "rounded-bl-md bg-[var(--semantic-selected)]"
                          }`}
                        >
                          <span className="line-clamp-3 whitespace-pre-wrap break-words">
                            {message.content}
                          </span>
                        </span>
                        {isOwn && message.status !== "sent" ? (
                          <span className="mt-0.5 flex items-center gap-2" role="status">
                            {message.status === "sending" ? (
                              <span className="text-xs text-[var(--semantic-text-secondary)]">
                                Enviando…
                              </span>
                            ) : (
                              <>
                                <span className="text-xs font-medium text-[var(--semantic-danger)]">
                                  Não enviado
                                </span>
                                <Button
                                  size="sm"
                                  variant="tertiary"
                                  className="min-h-11"
                                  onPress={() => handleRetry(message)}
                                >
                                  Tentar novamente
                                </Button>
                              </>
                            )}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="border-t border-border px-4 py-3">
              {sendError ? (
                <div className="mb-2">
                  <FeedbackAlert variant="danger" description={sendError} />
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <TextArea
                  placeholder="Escreva uma mensagem"
                  aria-label="Escreva uma mensagem"
                  value={newMessage}
                  onChange={(event) => setNewMessage((event.target as HTMLTextAreaElement).value)}
                  rows={2}
                  maxLength={2000}
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  className="min-h-11"
                  isDisabled={sending || newMessage.trim().length === 0}
                  onPress={handleSend}
                >
                  Enviar
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted">Mantenha a conversa no contexto do pedido.</p>
              <p className="text-xs text-muted">
                Evite enviar contatos pessoais ou solicitar pagamentos antecipados.
              </p>
            </div>
          </Card>
        </section>

        <aside className="order-3 flex flex-col gap-4 md:col-span-2 lg:col-span-1">
          <Card className="border border-border">
            <h2 className="px-4 pt-4 pb-2 text-sm font-semibold">Sobre o serviço solicitado</h2>
            <ul className="flex flex-col gap-2 px-4 pb-4 text-sm">
              {request.location ? (
                <li className="flex items-center gap-2">
                  <MapPin size={16} aria-hidden="true" className="text-muted" />
                  <span>{request.location}</span>
                </li>
              ) : null}
              <li className="flex items-center gap-2">
                <Calendar size={16} aria-hidden="true" className="text-muted" />
                <span>{whenText ?? "A combinar"}</span>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle size={16} aria-hidden="true" className="text-muted" />
                <span>{request.categoryLabel}</span>
              </li>
              <li className="flex items-start gap-2">
                <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
                <span className="text-muted">{description}</span>
              </li>
            </ul>
            {isRequester && !closed ? (
              editing ? (
                <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
                  <label className="text-sm font-medium" htmlFor="editar-descricao">
                    Descrição do que você precisa
                  </label>
                  <TextArea
                    id="editar-descricao"
                    value={editDescription}
                    onChange={(event) =>
                      setEditDescription((event.target as HTMLTextAreaElement).value)
                    }
                    maxLength={500}
                    rows={3}
                  />
                  <label className="text-sm font-medium" htmlFor="editar-quando">
                    Prazo ou horário desejado (opcional)
                  </label>
                  <input
                    id="editar-quando"
                    value={editWhen}
                    onChange={(event) => setEditWhen(event.target.value)}
                    maxLength={120}
                    className="min-h-11 rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-instant)]"
                  />
                  {editError ? <FeedbackAlert variant="danger" description={editError} /> : null}
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      className="min-h-11 flex-1"
                      isDisabled={savingEdit}
                      onPress={() => void handleSaveEdit()}
                    >
                      {savingEdit ? "Salvando…" : "Salvar"}
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-11"
                      onPress={() => {
                        setEditing(false)
                        setEditError(null)
                        setEditDescription(description)
                        setEditWhen(whenText ?? "")
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="px-4 pb-4">
                  <Button
                    variant="secondary"
                    className="min-h-11 w-full"
                    onPress={() => setEditing(true)}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    Editar pedido
                  </Button>
                </div>
              )
            ) : null}
          </Card>

          <Card className="border border-border">
            <h2 className="flex items-center gap-2 px-4 pt-4 pb-2 text-sm font-semibold">
              <Info size={16} aria-hidden="true" className="text-muted" />
              Público deste pedido
            </h2>
            <p className="px-4 pb-3 text-sm text-muted">
              {request.categoryLabel}
              {request.location ? ` em ${request.location}` : ""}
            </p>
            <p className="px-4 pb-3 text-sm text-muted">
              Somente você e {request.providerName} veem este pedido.
            </p>
            <div className="mx-4 mb-4 flex items-start gap-2 rounded-xl bg-[var(--semantic-selected)] px-3 py-2.5 text-sm">
              <ShieldCheck
                size={16}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-[var(--semantic-action-primary)]"
              />
              <span>
                <span className="block font-medium">
                  Valores e pagamento são combinados entre vocês.
                </span>
                <span className="block text-muted">
                  O Bivaque não participa da negociação nem realiza pagamentos.
                </span>
              </span>
            </div>
          </Card>

          {unreadCount > 0 ? (
            <p role="status" className="text-xs text-muted">
              {unreadCount === 1
                ? "1 resposta nova para você."
                : `${unreadCount} respostas novas para você.`}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
