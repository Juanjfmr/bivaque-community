"use client"

import { Button, Chip, Input, TextArea, useOverlayState } from "@heroui/react"
import { ExternalLink, MapPin } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { callResolutionRpc } from "../../../lib/recommendations/resolution-rpcs"
import { localityScopeLabel } from "../../../lib/recommendations/scope-label"
import {
  resolutionOperation,
  writeFailure,
} from "../../../lib/recommendations/write-failure-copy"
import { createBrowserClient } from "../../../lib/supabase/client"
import { Card } from "./card"
import { EmptyState } from "./empty-state"
import { LeanOverflowMenu } from "./feed-post-menu"
import { FeedbackAlert } from "./feedback-alert"
import { ReportButton, type ReportTargetType } from "./report-button"
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
  resolved_reply_id: string | null
}

type ReplyRow = {
  id: string
  request_id: string
  author_id: string
  body: string
  created_at: string
}

// DS-006: o ÚNICO vínculo resposta↔Guia que o servidor prova. `source_reply_id`
// é preenchido por `promote_reply_to_guide` (operador) quando a resposta vira
// item canônico. `recommendation_replies` não tem coluna de vínculo na escrita
// e `recommendation_reply_promotions` é service_role — um membro não lê nenhuma
// das duas. Sem linha aqui, a tela não mostra vínculo nenhum.
type GuideLinkRow = {
  id: string
  name: string
  source_reply_id: string | null
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
  // DS-006: o chip de alcance fala do PEDIDO, não de quem lê. A localidade do
  // pedido já vem no próprio SELECT (`locality_id`); usar a cidade da sessão
  // rotulava um pedido de outra cidade com a cidade errada.
  const { current, outbound } = useLocalityContext()

  const localityLabelFor = useCallback(
    (request: Pick<RequestRow, "group_id" | "locality_id">): string =>
      localityScopeLabel({
        groupId: request.group_id,
        localityId: request.locality_id,
        currentId: current.id,
        currentCityName: current.cityName,
        outbound,
      }),
    [current.id, current.cityName, outbound],
  )

  const [requests, setRequests] = useState<RequestRow[]>([])
  const [repliesByRequest, setRepliesByRequest] = useState<Record<string, ReplyRow[]>>({})
  const [savedRequestIds, setSavedRequestIds] = useState<Set<string>>(new Set())
  // Prancha 80: o meta do card traz a autora ("há 3 dias · Renata M.") e cada
  // resposta traz quem respondeu. O nome sai de profiles, pela mesma RLS que já
  // deixa ler o pedido — sem função nova e sem duplicar nome no payload.
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({})
  const [currentUserId, setCurrentUserId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [feedback, setFeedback] = useState("")
  // DS-006 (prancha 80): `Responder` abre e fecha UMA composição por pedido. O
  // rascunho é POR PEDIDO — antes havia um único `replyText` para todos, e
  // digitar em um pedido apagava o texto dos outros.
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [openReplyId, setOpenReplyId] = useState<string | null>(null)
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editBody, setEditBody] = useState("")
  const [editReplyId, setEditReplyId] = useState<string | null>(null)
  const [editReplyText, setEditReplyText] = useState("")
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolutionAction, setResolutionAction] = useState<string | null>(null)
  // Moderação e ações raras ficam no overflow (prancha 80): ocultar é gesto
  // local desta lista, denunciar abre o modal real de /reports.
  const [hiddenRequestIds, setHiddenRequestIds] = useState<Set<string>>(new Set())
  const [hiddenReplyIds, setHiddenReplyIds] = useState<Set<string>>(new Set())
  const [guideLinksByReplyId, setGuideLinksByReplyId] = useState<
    Record<string, { id: string; name: string }>
  >({})
  const [reportTarget, setReportTarget] = useState<{
    type: ReportTargetType
    id: string
    authorId: string | null
  } | null>(null)
  const reportModal = useOverlayState()

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
      .select(
        "id, author_id, locality_id, group_id, title, body, category, created_at, is_resolved, resolved_reply_id",
      )
      .order("created_at", { ascending: false })

    if (requestError) {
      setError("Não foi possível carregar os pedidos de indicação.")
      setLoading(false)
      return
    }

    const nextRequests = (requestData as unknown as RequestRow[] | null) ?? []
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

      // Vínculo real com o Guia (prancha 80: "Transmuda Recife" + "Ver no Guia").
      // Só leitura de dado aprovado da própria localidade, pela RLS existente.
      // Falha aqui não derruba a conversa: sem o dado, nenhum vínculo aparece.
      const replyIds = Object.values(nextReplies)
        .flat()
        .map((reply) => reply.id)
      const nextGuideLinks: Record<string, { id: string; name: string }> = {}
      if (replyIds.length > 0) {
        const { data: linkData, error: linkError } = await supabase
          .from("arrival_guide_entries")
          .select("id, name, source_reply_id")
          .in("source_reply_id", replyIds)
          .eq("status", "approved")
        if (!linkError) {
          for (const row of (linkData as unknown as GuideLinkRow[] | null) ?? []) {
            if (row.source_reply_id) {
              nextGuideLinks[row.source_reply_id] = { id: row.id, name: row.name }
            }
          }
        }
      }
      setGuideLinksByReplyId(nextGuideLinks)

      const authorIds = [
        ...new Set([
          ...nextRequests.map((request) => request.author_id),
          ...Object.values(nextReplies)
            .flat()
            .map((reply) => reply.author_id),
        ]),
      ]
      if (authorIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", authorIds)

        // Nome é enfeite do card: falhar aqui não pode esconder o pedido.
        if (!profileError) {
          setAuthorNames(
            Object.fromEntries(
              ((profileData as { user_id: string; display_name: string }[] | null) ?? []).map(
                (profile) => [profile.user_id, profile.display_name],
              ),
            ),
          )
        }
      }
    } else {
      setRepliesByRequest({})
      setSavedRequestIds(new Set())
      setAuthorNames({})
      setGuideLinksByReplyId({})
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

      const body = (replyDrafts[requestId] ?? "").trim()
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
        // ITEM 9: frase de produto na tela, causa crua no log.
        setFeedback(writeFailure("responder_pedido", replyError.message))
        setReplyingId(null)
        return
      }

      // A composição daquele pedido fecha e o rascunho dele é o único limpo.
      setReplyDrafts((previous) => ({ ...previous, [requestId]: "" }))
      setOpenReplyId((previous) => (previous === requestId ? null : previous))
      setReplyingId(null)
      await loadRequests()
    },
    [supabase, currentUserId, replyDrafts, loadRequests],
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
          setFeedback(writeFailure("remover_pedido_salvo", deleteError.message))
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
          setFeedback(writeFailure("salvar_pedido", insertError.message))
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
        setFeedback(writeFailure("editar_pedido", updateError.message))
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
        setFeedback(writeFailure("excluir_pedido", deleteError.message))
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
        setFeedback(writeFailure("excluir_resposta", deleteError.message))
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
        setFeedback(writeFailure("editar_resposta", updateError.message))
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
        setFeedback(writeFailure("resolver_pedido", rpcError.message))
        return
      }
      await loadRequests()
    },
    [supabase, loadRequests],
  )

  // RECON-035 — só a autora marca, limpa ou reabre; o servidor revalida.
  const runResolutionAction = useCallback(
    async (actionKey: string, call: () => Promise<{ error: { message: string } | null }>) => {
      setFeedback("")
      setResolutionAction(actionKey)
      const { error: rpcError } = await call()
      setResolutionAction(null)
      if (rpcError) {
        // A chave diz QUAL das três ações falhou (marcar, limpar ou reabrir).
        setFeedback(writeFailure(resolutionOperation(actionKey), rpcError.message))
        return
      }
      await loadRequests()
    },
    [loadRequests],
  )

  const handleMarkResolvedReply = useCallback(
    (requestId: string, replyId: string) =>
      runResolutionAction(`mark:${requestId}:${replyId}`, () =>
        callResolutionRpc(supabase, "mark_recommendation_reply_resolved", {
          p_request_id: requestId,
          p_reply_id: replyId,
        }),
      ),
    [runResolutionAction, supabase],
  )

  const handleClearResolvedReply = useCallback(
    (requestId: string) =>
      runResolutionAction(`clear:${requestId}`, () =>
        callResolutionRpc(supabase, "clear_recommendation_resolved_reply", {
          p_request_id: requestId,
        }),
      ),
    [runResolutionAction, supabase],
  )

  const handleReopenRequest = useCallback(
    (requestId: string) =>
      runResolutionAction(`reopen:${requestId}`, () =>
        callResolutionRpc(supabase, "reopen_recommendation", { p_request_id: requestId }),
      ),
    [runResolutionAction, supabase],
  )

  // ─ DS-006: composição de resposta, ocultar e denunciar ────────────────────

  const setReplyDraft = useCallback((requestId: string, value: string) => {
    // Estado POR PEDIDO (ver o comentário do useState): cada composição guarda
    // o próprio texto e fechar uma não apaga o rascunho da outra.
    setReplyDrafts((previous) => ({ ...previous, [requestId]: value }))
  }, [])

  // `Responder` é abre/fecha, não envio. Um único formulário por pedido: o
  // textarea só existe montado quando aquele pedido está aberto, e o botão que
  // o abriu é o mesmo que o fecha.
  const toggleReplyComposer = useCallback((requestId: string) => {
    setFeedback("")
    setOpenReplyId((previous) => (previous === requestId ? null : requestId))
  }, [])

  const closeReplyComposer = useCallback(() => setOpenReplyId(null), [])

  const openReport = useCallback(
    (type: ReportTargetType, id: string, authorId: string | null) => {
      setReportTarget({ type, id, authorId })
      reportModal.open()
    },
    [reportModal],
  )

  const handleHideRequest = useCallback((requestId: string) => {
    setHiddenRequestIds((previous) => new Set(previous).add(requestId))
  }, [])

  const handleHideReply = useCallback((replyId: string) => {
    setHiddenReplyIds((previous) => new Set(previous).add(replyId))
  }, [])

  // Ocultar é gesto local da lista (nada é apagado no servidor): o pedido some
  // desta leitura e volta no próximo carregamento da página.
  const visibleRequests = requests.filter((request) => !hiddenRequestIds.has(request.id))

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

      {!loading && !error && visibleRequests.length === 0 && (
        <EmptyState
          title="Nenhum pedido por aqui"
          description="Quando alguém pedir uma indicação, ela aparecerá nesta lista com as respostas."
        />
      )}

      {!loading && !error && visibleRequests.length > 0 && (
        <div className="flex flex-col gap-4">
          {visibleRequests.map((request) => {
            const replies = (repliesByRequest[request.id] ?? []).filter(
              (reply) => !hiddenReplyIds.has(reply.id),
            )
            const isEditing = editingId === request.id
            const isSaved = savedRequestIds.has(request.id)
            const isAuthor = request.author_id === currentUserId

            return (
              // A âncora `#req-<id>` que /salvos, /notifications e o Guia já
              // emitem precisa existir: o wrapper Card não repassa `id`, então
              // o alvo do hash fica no elemento que esta tela controla.
              <div key={request.id} id={`req-${request.id}`} className="scroll-mt-24">
                <Card className="p-4">
                  <div className="flex flex-col gap-3">
                    {/* Prancha 80: o pedido abre pelo TÍTULO, como título da
                        conversa — não por um h3 de 14px depois dos chips. O h1
                        da rota continua "Indicações": a captura visual e o e2e
                        dependem dele. */}
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="min-w-0 text-2xl font-semibold tracking-tight sm:text-3xl">
                        {request.title}
                      </h2>

                      {/* Ações raras e de moderação vivem no overflow (prancha 80).
                        `Denunciar` nunca é ação primária. */}
                      <div className="shrink-0">
                        <LeanOverflowMenu
                          postId={request.id}
                          sharePath={`/recommendations?focus=${request.id}#req-${request.id}`}
                          menuLabel="Ações do pedido"
                          labels={{
                            edit: "Editar pedido",
                            delete: "Excluir pedido",
                            hide: "Ocultar pedido",
                            share: "Compartilhar pedido",
                            report: "Denunciar pedido",
                            reopen: "Reabrir pedido",
                          }}
                          onEdit={isAuthor && !isEditing ? () => startEdit(request) : undefined}
                          onDelete={isAuthor ? () => deleteRequest(request.id) : undefined}
                          onHide={handleHideRequest}
                          // Reabrir fica no overflow quando o fechamento já está
                          // dito pela resposta marcada: assim o pedido não repete
                          // o mesmo aviso em dois lugares.
                          onReopen={
                            isAuthor && request.is_resolved
                              ? () => handleReopenRequest(request.id)
                              : undefined
                          }
                          onReport={() =>
                            openReport("recommendation_request", request.id, request.author_id)
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Chip size="sm" variant="soft">
                        {CATEGORY_LABELS[request.category] ?? request.category}
                      </Chip>
                      <Chip size="sm" variant="soft">
                        {localityLabelFor(request)}
                      </Chip>
                      <span className="text-xs text-muted">
                        {formatDate(request.created_at)}
                        {authorNames[request.author_id]
                          ? ` · ${authorNames[request.author_id]}`
                          : ""}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="flex flex-col gap-3">
                        <Input
                          aria-label="Título"
                          value={editTitle}
                          onChange={(event) =>
                            setEditTitle((event.target as HTMLInputElement).value)
                          }
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
                          <Button
                            size="sm"
                            variant="primary"
                            className="rounded-[var(--semantic-radius-control)]"
                            onPress={() => saveEdit(request.id)}
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="tertiary"
                            className="rounded-[var(--semantic-radius-control)]"
                            onPress={cancelEdit}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // A1 (parecer R2): o corpo do pedido é leitura longa —
                      // medido a 1120 px e ~132 caracteres por linha antes do
                      // reparo. `measure-reading` aplica o limite do produto
                      // (semantic.typography-reading-measure, 72ch).
                      <p className="measure-reading text-sm text-muted">{request.body}</p>
                    )}

                    {/* DS-006 (prancha 80): `Responder` fica logo sob o corpo do
                        pedido, antes das respostas — não depois de toda a
                        conversa. Ele abre e fecha a composição deste pedido. */}
                    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                      <Button
                        size="sm"
                        variant={openReplyId === request.id ? "secondary" : "primary"}
                        className="rounded-[var(--semantic-radius-control)]"
                        aria-expanded={openReplyId === request.id}
                        aria-controls={`reply-composer-${request.id}`}
                        onPress={() => toggleReplyComposer(request.id)}
                      >
                        Responder
                      </Button>
                      <Button
                        size="sm"
                        variant={isSaved ? "secondary" : "tertiary"}
                        className="rounded-[var(--semantic-radius-control)]"
                        isDisabled={savingId === request.id}
                        onPress={() => toggleSave(request.id)}
                      >
                        {savingId === request.id ? "Salvando..." : isSaved ? "Salvo" : "Salvar"}
                      </Button>
                    </div>

                    {openReplyId === request.id ? (
                      <div id={`reply-composer-${request.id}`} className="flex flex-col gap-2">
                        <TextArea
                          aria-label={`Responder a ${request.title}`}
                          placeholder="Responder com uma indicação..."
                          rows={2}
                          autoFocus
                          value={replyDrafts[request.id] ?? ""}
                          onChange={(event) =>
                            setReplyDraft(request.id, (event.target as HTMLTextAreaElement).value)
                          }
                          // Escape fecha a composição sem publicar nada — o
                          // gesto de sair de um campo de resposta.
                          onKeyDown={(event) => {
                            if (event.key === "Escape") closeReplyComposer()
                          }}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            className="rounded-[var(--semantic-radius-control)]"
                            isDisabled={
                              replyingId === request.id ||
                              (replyDrafts[request.id] ?? "").trim().length < 5
                            }
                            onPress={() => handleReply(request.id)}
                          >
                            {replyingId === request.id ? "Enviando..." : "Enviar resposta"}
                          </Button>
                          <Button
                            size="sm"
                            variant="tertiary"
                            className="rounded-[var(--semantic-radius-control)]"
                            onPress={closeReplyComposer}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {replies.length > 0 && (
                      <ul className="flex flex-col gap-2 border-t border-border pt-3">
                        {replies.map((reply) => {
                          const isMarked = request.resolved_reply_id === reply.id
                          const isMarking = resolutionAction === `mark:${request.id}:${reply.id}`
                          const isClearing = resolutionAction === `clear:${request.id}`
                          // Vínculo com o Guia SÓ quando o servidor tem a linha
                          // (item canônico promovido a partir desta resposta). Sem
                          // ela, nenhuma etiqueta de curadoria é desenhada.
                          const guideLink = guideLinksByReplyId[reply.id]

                          return (
                            <li
                              key={reply.id}
                              className={`flex flex-col gap-1 rounded-[var(--semantic-radius-card)] border border-border p-2 text-sm ${
                                isMarked
                                  ? "border-l-4 border-l-[var(--semantic-success)] bg-[var(--semantic-success-soft)]"
                                  : ""
                              }`}
                            >
                              {isMarked && (
                                <div className="flex">
                                  <Chip size="sm" variant="soft" color="success">
                                    Ajudou a resolver
                                  </Chip>
                                </div>
                              )}
                              {guideLink ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                                    <MapPin size={12} aria-hidden="true" />
                                    {guideLink.name}
                                  </span>
                                  <Link
                                    href={`/guide/${guideLink.id}` as Route}
                                    className="inline-flex min-h-11 items-center gap-1 rounded-[var(--semantic-radius-control)] border border-[var(--semantic-action-primary)] px-2 text-xs font-medium text-[var(--semantic-action-primary)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                                  >
                                    Ver no Guia
                                    <ExternalLink size={12} aria-hidden="true" />
                                  </Link>
                                </div>
                              ) : null}
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
                                      className="rounded-[var(--semantic-radius-control)]"
                                      onPress={() => saveEditReply(reply.id)}
                                    >
                                      Salvar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="tertiary"
                                      className="rounded-[var(--semantic-radius-control)]"
                                      onPress={cancelEditReply}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  {/* A1: mesma medida de leitura do corpo do
                                      pedido — a resposta é texto corrido, não
                                      lista de comparação (DESIGN_SYSTEM §8.2). */}
                                  <span className="measure-reading flex flex-col gap-1 text-sm text-muted">
                                    {authorNames[reply.author_id] && (
                                      <span className="text-xs font-medium text-foreground">
                                        {authorNames[reply.author_id]}
                                      </span>
                                    )}
                                    {reply.body}
                                  </span>
                                  <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                                    {isAuthor && !isMarked && (
                                      <Button
                                        size="sm"
                                        variant="tertiary"
                                        className="rounded-[var(--semantic-radius-control)] min-h-11 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                                        isDisabled={isMarking}
                                        onPress={() =>
                                          handleMarkResolvedReply(request.id, reply.id)
                                        }
                                      >
                                        {isMarking ? "Marcando..." : "Ajudou a resolver"}
                                      </Button>
                                    )}
                                    {isAuthor && isMarked && (
                                      <Button
                                        size="sm"
                                        variant="tertiary"
                                        className="rounded-[var(--semantic-radius-control)] min-h-11 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                                        isDisabled={isClearing}
                                        onPress={() => handleClearResolvedReply(request.id)}
                                      >
                                        {isClearing ? "Removendo..." : "Remover marca"}
                                      </Button>
                                    )}
                                    {/* Editar, excluir, ocultar e denunciar são
                                      ações raras: ficam no overflow, nunca ao
                                      lado do fechamento do ciclo. */}
                                    <LeanOverflowMenu
                                      postId={reply.id}
                                      menuLabel="Ações da resposta"
                                      labels={{
                                        edit: "Editar resposta",
                                        delete: "Excluir resposta",
                                        hide: "Ocultar resposta",
                                        report: "Denunciar resposta",
                                      }}
                                      onEdit={
                                        reply.author_id === currentUserId
                                          ? () => {
                                              setEditReplyId(reply.id)
                                              setEditReplyText(reply.body)
                                            }
                                          : undefined
                                      }
                                      onDelete={
                                        reply.author_id === currentUserId
                                          ? () => handleDeleteReply(reply.id)
                                          : undefined
                                      }
                                      onHide={handleHideReply}
                                      onReport={() =>
                                        openReport(
                                          "recommendation_reply",
                                          reply.id,
                                          reply.author_id,
                                        )
                                      }
                                    />
                                  </div>
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}

                    {/* UM sinal de fechamento por estado (DS-006, prancha 80):
                        com resposta marcada, o chip `Ajudou a resolver` naquela
                        resposta já diz o que aconteceu, e `Reabrir` vive no
                        overflow; sem resposta marcada, esta faixa é o único
                        lugar que diz que a autora resolveu — e o único com
                        `Reabrir`. Antes os dois apareciam juntos, somando três
                        avisos para o mesmo fato. */}
                    {request.is_resolved && request.resolved_reply_id === null ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--semantic-radius-card)] bg-[var(--semantic-surface-sunken)] px-3 py-2">
                        <span className="text-xs font-medium text-muted">
                          Resolvida pela autora
                        </span>
                        {isAuthor && (
                          <Button
                            size="sm"
                            variant="tertiary"
                            className="rounded-[var(--semantic-radius-control)] min-h-11 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                            isDisabled={resolutionAction === `reopen:${request.id}`}
                            onPress={() => handleReopenRequest(request.id)}
                          >
                            {resolutionAction === `reopen:${request.id}`
                              ? "Reabrindo..."
                              : "Reabrir"}
                          </Button>
                        )}
                      </div>
                    ) : !request.is_resolved && isAuthor ? (
                      <div className="flex justify-end border-t border-border pt-3">
                        <Button
                          size="sm"
                          variant="tertiary"
                          className="rounded-[var(--semantic-radius-control)] text-xs"
                          isDisabled={resolvingId === request.id}
                          onPress={() => handleMarkResolved(request.id)}
                        >
                          Marcar como resolvido
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      {/* Um único modal de denúncia para a lista inteira, reiniciado pelo
          `key`: o alvo vem do overflow que o abriu (pedido ou resposta), e o
          ReportButton continua sendo o mecanismo real de /reports.
          `blockUserId` só entra quando há autor conhecido — `exactOptionalPropertyTypes`
          não aceita `undefined` explícito, e bloqueio sem saber a quem bloquear
          não é oferecido. */}
      {reportTarget ? (
        <ReportButton
          key={`${reportTarget.type}:${reportTarget.id}`}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          {...(reportTarget.authorId ? { blockUserId: reportTarget.authorId } : {})}
          externalState={reportModal}
        />
      ) : null}
    </div>
  )
}
