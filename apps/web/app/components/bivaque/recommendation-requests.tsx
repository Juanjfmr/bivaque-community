"use client"

import { Button, Chip, Input, TextArea } from "@heroui/react"
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

  return (
    <div className="flex flex-col gap-4">
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
                      <h3 className="text-sm font-semibold">{request.title}</h3>
                      <p className="text-sm text-muted">{request.body}</p>
                    </div>
                  )}

                  {replies.length > 0 && (
                    <ul className="flex flex-col gap-2 border-t border-border pt-3">
                      {replies.map((reply) => (
                        <li key={reply.id} className="text-sm text-muted">
                          {reply.body}
                        </li>
                      ))}
                    </ul>
                  )}

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
