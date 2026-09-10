"use client"

import { Button, Chip, Input, TextArea } from "@heroui/react"
import type { Route } from "next"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import { Card } from "./card"
import { EmptyState } from "./empty-state"
import { FeedbackAlert } from "./feedback-alert"
import { Skeleton } from "./skeleton"

type RequestRow = {
  id: string
  author_id: string
  locality_id: string | null
  group_id: string | null
  title: string
  body: string
  category: string
  created_at: string
  is_resolved: boolean
}

type ReplyRow = {
  id: string
  request_id: string
  author_id: string
  body: string
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  servicos_locais: "Serviços locais",
  saude_bem_estar: "Saúde & bem-estar",
  educacao: "Educação",
  esporte_lazer: "Esporte & lazer",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  moradia: "Moradia",
  outros: "Outros",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  })
}

export default function RecommendationRequests() {
  const supabase = createBrowserClient()

  const [requests, setRequests] = useState<RequestRow[]>([])
  const [repliesByRequest, setRepliesByRequest] = useState<Record<string, ReplyRow[]>>({})
  const [savedRequestIds, setSavedRequestIds] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [feedback, setFeedback] = useState("")
  const [replyText, setReplyText] = useState("")
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editBody, setEditBody] = useState("")
  const [editReplyId, setEditReplyId] = useState<string | null>(null)
  const [editReplyText, setEditReplyText] = useState("")
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError("")

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError("Você precisa entrar para ver indicações.")
      setLoading(false)
      return
    }
    setCurrentUserId(user.id)

    const { data: requestData, error: requestError } = await supabase
      .from("recommendation_requests")
      .select("id, author_id, locality_id, group_id, title, body, category, created_at")
      .order("created_at", { ascending: false })

    if (requestError) {
      setError("Não foi possível carregar os pedidos de indicação.")
      setLoading(false)
      return
    }

    const nextRequests = (requestData as RequestRow[] | null) ?? []
    setRequests(nextRequests)

    const requestIds = nextRequests.map((request) => request.id)
    if (requestIds.length > 0) {
      const [{ data: repliesData, error: repliesError }, { data: savesData, error: savesError }] =
        await Promise.all([
          supabase
            .from("recommendation_replies")
            .select("id, request_id, author_id, body, created_at")
            .in("request_id", requestIds)
            .order("created_at", { ascending: true }),
          supabase
            .from("recommendation_saves")
            .select("request_id")
            .eq("user_id", user.id)
            .in("request_id", requestIds),
        ])

      if (repliesError || savesError) {
        setError("Não foi possível carregar respostas e salvos.")
        setLoading(false)
        return
      }

      const nextReplies: Record<string, ReplyRow[]> = {}
      for (const reply of (repliesData as ReplyRow[] | null) ?? []) {
        nextReplies[reply.request_id] = [...(nextReplies[reply.request_id] ?? []), reply]
      }
      setRepliesByRequest(nextReplies)
      setSavedRequestIds(
        new Set((savesData as { request_id: string }[] | null)?.map((save) => save.request_id)),
      )
    } else {
      setRepliesByRequest({})
      setSavedRequestIds(new Set())
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleReply = useCallback(
    async (requestId: string) => {
      setReplyingId(requestId)
      setFeedback("")

      const body = replyText.trim()
      if (body.length < 5) {
        setFeedback("Escreva uma resposta com pelo menos 5 caracteres.")
        setReplyingId(null)
        return
      }

      const { error: replyError } = await supabase.from("recommendation_replies").insert({
        request_id: requestId,
        author_id: currentUserId,
        body,
      })

      if (replyError) {
        setFeedback(replyError.message)
        setReplyingId(null)
        return
      }

      setReplyText("")
      setReplyingId(null)
      await loadRequests()
    },
    [supabase, currentUserId, replyText, loadRequests],
  )

  const toggleSave = useCallback(
    async (requestId: string) => {
      setSavingId(requestId)
      setFeedback("")

      if (savedRequestIds.has(requestId)) {
        const { error: deleteError } = await supabase
          .from("recommendation_saves")
          .delete()
          .eq("user_id", currentUserId)
          .eq("request_id", requestId)

        if (deleteError) {
          setFeedback(deleteError.message)
          setSavingId(null)
          return
        }

        setSavedRequestIds((previous) => {
          const next = new Set(previous)
          next.delete(requestId)
          return next
        })
      } else {
        const { error: insertError } = await supabase.from("recommendation_saves").insert({
          user_id: currentUserId,
          request_id: requestId,
        })

        if (insertError) {
          setFeedback(insertError.message)
          setSavingId(null)
          return
        }

        setSavedRequestIds((previous) => new Set(previous).add(requestId))
      }

      setSavingId(null)
    },
    [supabase, currentUserId, savedRequestIds],
  )

  const startEdit = useCallback((request: RequestRow) => {
    setEditingId(request.id)
    setEditTitle(request.title)
    setEditBody(request.body)
    setFeedback("")
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setEditTitle("")
    setEditBody("")
  }, [])

  const saveEdit = useCallback(
    async (requestId: string) => {
      setFeedback("")
      if (editTitle.trim().length < 3 || editBody.trim().length < 10) {
        setFeedback("Título e descrição precisam respeitar os tamanhos mínimos.")
        return
      }

      const { error: updateError } = await supabase
        .from("recommendation_requests")
        .update({ title: editTitle.trim(), body: editBody.trim() })
        .eq("id", requestId)
        .eq("author_id", currentUserId)

      if (updateError) {
        setFeedback(updateError.message)
        return
      }

      cancelEdit()
      await loadRequests()
    },
    [supabase, currentUserId, editTitle, editBody, cancelEdit, loadRequests],
  )

  const deleteRequest = useCallback(
    async (requestId: string) => {
      setFeedback("")
      const { error: deleteError } = await supabase
        .from("recommendation_requests")
        .delete()
        .eq("id", requestId)
        .eq("author_id", currentUserId)

      if (deleteError) {
        setFeedback(deleteError.message)
        return
      }

      await loadRequests()
    },
    [supabase, currentUserId, loadRequests],
  )

  // Wave F Task 5 Step 2 — the author can edit or delete their own reply.
  const handleDeleteReply = useCallback(
    async (replyId: string) => {
      setFeedback("")
      const { error: deleteError } = await supabase
        .from("recommendation_replies")
        .delete()
        .eq("id", replyId)
        .eq("author_id", currentUserId)

      if (deleteError) {
        setFeedback(deleteError.message)
        return
      }
      await loadRequests()
    },
    [supabase, currentUserId, loadRequests],
  )

  const cancelEditReply = useCallback(() => {
    setEditReplyId(null)
    setEditReplyText("")
  }, [])

  const saveEditReply = useCallback(
    async (replyId: string) => {
      setFeedback("")
      if (editReplyText.trim().length < 5) {
        setFeedback("A resposta precisa de ao menos 5 caracteres.")
        return
      }
      const { error: updateError } = await supabase
        .from("recommendation_replies")
        .update({ body: editReplyText.trim() })
        .eq("id", replyId)
        .eq("author_id", currentUserId)

      if (updateError) {
        setFeedback(updateError.message)
        return
      }
      cancelEditReply()
      await loadRequests()
    },
    [supabase, currentUserId, editReplyText, cancelEditReply, loadRequests],
  )

  // Wave F Task 5 Step 4 — the author marks the request resolved (closes the
  // §6.3 cycle; feeds guide curation).
  const handleMarkResolved = useCallback(
    async (requestId: string) => {
      setFeedback("")
      setResolvingId(requestId)
      // The RPC is new (migration 033) — not in generated types yet until
      // `supabase gen types`. Cast the call; the runtime contract is SQL.
      const resolvedRpc = supabase.rpc as unknown as (
        name: "mark_recommendation_resolved",
        args: { p_request_id: string },
      ) => Promise<{ data: null; error: { message: string } | null }>
      const { error: rpcError } = await resolvedRpc("mark_recommendation_resolved", {
        p_request_id: requestId,
      })
      setResolvingId(null)
      if (rpcError) {
        setFeedback(rpcError.message)
        return
      }
      await loadRequests()
    },
    [supabase, loadRequests],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">As perguntas da sua cidade e dos seus grupos.</p>
        <Link
          href={"/publicacoes/nova" as Route}
          className="inline-flex min-h-11 items-center rounded-lg bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors hover:bg-[var(--semantic-action-primary-hover)]"
        >
          Nova pergunta
        </Link>
      </div>
      {feedback && (
        <FeedbackAlert variant="info" description={feedback} onClose={() => setFeedback("")} />
      )}

      {error && <FeedbackAlert variant="danger" description={error} />}

      {loading && (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <EmptyState
          title="Nenhum pedido por aqui"
          description="Quando alguém pedir uma indicação, ela aparecerá nesta lista com as respostas."
        />
      )}

      {!loading && !error && requests.length > 0 && (
        <div className="flex flex-col gap-4">
          {requests.map((request) => {
            const replies = repliesByRequest[request.id] ?? []
            const isEditing = editingId === request.id
            const isSaved = savedRequestIds.has(request.id)
            const isAuthor = request.author_id === currentUserId

            return (
              <Card key={request.id} className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip size="sm" variant="soft">
                          {CATEGORY_LABELS[request.category] ?? request.category}
                        </Chip>
                        <Chip size="sm" variant="soft">
                          {request.group_id ? "Grupo" : "Manaus"}
                        </Chip>
                        <span className="text-xs text-muted">{formatDate(request.created_at)}</span>
                      </div>
                    </div>

                    {isAuthor && !isEditing && (
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          variant="tertiary"
                          className="text-xs"
                          onPress={() => startEdit(request)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="tertiary"
                          className="text-xs"
                          onPress={() => deleteRequest(request.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex flex-col gap-3">
                      <Input
                        aria-label="Título"
                        value={editTitle}
                        onChange={(event) => setEditTitle((event.target as HTMLInputElement).value)}
                      />
                      <TextArea
                        aria-label="Descrição"
                        rows={3}
                        value={editBody}
                        onChange={(event) =>
                          setEditBody((event.target as HTMLTextAreaElement).value)
                        }
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="primary" onPress={() => saveEdit(request.id)}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="tertiary" onPress={cancelEdit}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-semibold">
                        <Link
                          href={`/publicacoes/${request.id}` as Route}
                          className="inline-flex min-h-11 items-center transition-colors hover:underline"
                        >
                          {request.title}
                        </Link>
                      </h3>
                      <p className="text-sm text-muted">{request.body}</p>
                    </div>
                  )}

                  {replies.length > 0 && (
                    <ul className="flex flex-col gap-2 border-t border-border pt-3">
                      {replies.map((reply) => (
                        <li
                          key={reply.id}
                          className="flex flex-col gap-1 rounded-md border border-border p-2 text-sm"
                        >
                          {editReplyId === reply.id ? (
                            <div className="flex flex-col gap-2">
                              <TextArea
                                aria-label="Editar resposta"
                                rows={2}
                                value={editReplyText}
                                onChange={(event) =>
                                  setEditReplyText((event.target as HTMLTextAreaElement).value)
                                }
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onPress={() => saveEditReply(reply.id)}
                                >
                                  Salvar
                                </Button>
                                <Button size="sm" variant="tertiary" onPress={cancelEditReply}>
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm text-muted">{reply.body}</span>
                              {reply.author_id === currentUserId && (
                                <div className="flex shrink-0 gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="tertiary"
                                    className="text-xs"
                                    onPress={() => {
                                      setEditReplyId(reply.id)
                                      setEditReplyText(reply.body)
                                    }}
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="tertiary"
                                    className="text-xs"
                                    onPress={() => handleDeleteReply(reply.id)}
                                  >
                                    Excluir
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {request.is_resolved ? (
                    <div className="flex items-center gap-2 rounded-md bg-[var(--semantic-surface-sunken)] px-3 py-2 text-xs font-medium text-muted">
                      ✅ Pedido resolvido
                    </div>
                  ) : isAuthor ? (
                    <div className="flex justify-end border-t border-border pt-3">
                      <Button
                        size="sm"
                        variant="tertiary"
                        className="text-xs"
                        isDisabled={resolvingId === request.id}
                        onPress={() => handleMarkResolved(request.id)}
                      >
                        Marcar como resolvido
                      </Button>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2 border-t border-border pt-3">
                    <TextArea
                      aria-label={`Responder a ${request.title}`}
                      placeholder="Responder com uma indicação..."
                      rows={2}
                      value={replyingId === request.id ? replyText : ""}
                      onChange={(event) => {
                        setReplyingId(request.id)
                        setReplyText((event.target as HTMLTextAreaElement).value)
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        isDisabled={replyingId === request.id && replyText.trim().length < 5}
                        onPress={() => handleReply(request.id)}
                      >
                        Responder
                      </Button>
                      <Button
                        size="sm"
                        variant={isSaved ? "secondary" : "tertiary"}
                        isDisabled={savingId === request.id}
                        onPress={() => toggleSave(request.id)}
                      >
                        {savingId === request.id ? "Salvando..." : isSaved ? "Salvo" : "Salvar"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
