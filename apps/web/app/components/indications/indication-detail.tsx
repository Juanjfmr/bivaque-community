"use client"

import { Button, Modal, TextArea, useOverlayState } from "@heroui/react"
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useId, useState } from "react"
import {
  categoryLabel,
  INDICATION_TITLE_MAX,
  INDICATIONS_HREF,
  type IndicationCategory,
  indicationHref,
  indicationStatusLabel,
  relativeAge,
  resolutionLabel,
  titleProblem,
} from "../../../lib/indications/indications"
import { callResolutionRpc } from "../../../lib/recommendations/resolution-rpcs"
import { accessibleSuffix, overflowTriggerLabel } from "../../../lib/recommendations/trigger-label"
import {
  readFailure,
  WRITE_FAILURE_COPY,
  type WriteOperation,
  writeFailure,
} from "../../../lib/recommendations/write-failure-copy"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "../bivaque/avatar"
import { ModalCloseTrigger } from "../bivaque/close-button"
import { EmptyState } from "../bivaque/empty-state"
import { ErrorState } from "../bivaque/error-state"
import { ReportButton, type ReportTargetType } from "../bivaque/report-button"
import { Skeleton } from "../bivaque/skeleton"
import { ConversationMenu } from "./conversation-menu"

// A conversa de um pedido de indicação (lote 5, ADR-20261023 seção 2). O que a
// tela passou a fazer, no protótipo de `question.js` e `manage.js`:
//   * a autoria edita e exclui a própria pergunta e a própria resposta, com a
//     marca "editada";
//   * a resolução tem dois jeitos — a resposta marcada e "resolvida sem
//     resposta" — com os rótulos "Resolvida" e "Resolvida por quem perguntou";
//   * reabrir é uma ação da autoria, no menu;
//   * a resposta removida pela moderação vira um aviso, sem texto e sem autor;
//   * a conversa só aceita resposta enquanto a pergunta está aberta.

const REPLY_MIN = 5
const REPLY_MAX = 2000

type RequestRow = {
  id: string
  author_id: string
  group_id: string | null
  title: string
  body: string
  category: IndicationCategory
  created_at: string
  edited_at: string | null
  is_resolved: boolean
  resolved_reply_id: string | null
  last_resolved_reply_id: string | null
}

type ReplyRow = {
  id: string
  author_id: string | null
  body: string | null
  created_at: string
  edited_at: string | null
  is_removed: boolean
}

type EditTarget = { kind: "question" } | { kind: "reply"; reply: ReplyRow }

type Loaded = {
  viewerId: string
  request: RequestRow
  replies: ReplyRow[]
  names: Record<string, string>
  saved: boolean
  guideLinks: Record<string, { id: string; name: string }>
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "missing" }
  | ({ kind: "done" } & Loaded)

async function loadIndication(requestId: string): Promise<LoadState> {
  const supabase = createBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { kind: "error", message: "Sua sessão expirou. Entre de novo." }

  const requestQuery = await supabase
    .from("recommendation_requests")
    .select(
      "id, author_id, group_id, title, body, category, created_at, edited_at, is_resolved, resolved_reply_id, last_resolved_reply_id",
    )
    .eq("id", requestId)
    .maybeSingle()
  if (requestQuery.error) {
    return { kind: "error", message: readFailure("carregar_pedidos", requestQuery.error.message) }
  }
  if (!requestQuery.data) return { kind: "missing" }
  const request = requestQuery.data as RequestRow

  // A conversa vem por `list_question_replies` (migration 20261024110000): é o
  // caminho que devolve a resposta removida pela moderação como aviso, sem texto
  // e sem autor. O SELECT direto respeita a policy e esconderia a resposta
  // removida inteira, sem aviso nenhum.
  const [repliesQuery, savedQuery] = await Promise.all([
    supabase.rpc("list_question_replies", { p_request_id: requestId }),
    supabase
      .from("recommendation_saves")
      .select("request_id")
      .eq("user_id", user.id)
      .eq("request_id", requestId)
      .maybeSingle(),
  ])
  const failure = repliesQuery.error ?? savedQuery.error
  if (failure) {
    return { kind: "error", message: readFailure("carregar_respostas_e_salvos", failure.message) }
  }
  const replies = (repliesQuery.data ?? []) as ReplyRow[]

  // Nome e vínculo com o Guia são enfeite: se falharem, a conversa continua.
  const visibleReplies = replies.filter((reply) => !reply.is_removed)
  const authorIds = [
    ...new Set([
      request.author_id,
      ...visibleReplies.map((reply) => reply.author_id).filter((id): id is string => Boolean(id)),
    ]),
  ]
  const [profilesQuery, guideQuery] = await Promise.all([
    supabase.from("profiles").select("user_id, display_name").in("user_id", authorIds),
    visibleReplies.length > 0
      ? supabase
          .from("arrival_guide_entries")
          .select("id, name, source_reply_id")
          .in(
            "source_reply_id",
            visibleReplies.map((reply) => reply.id),
          )
          .eq("status", "approved")
      : Promise.resolve({ data: [], error: null }),
  ])
  const names = Object.fromEntries(
    ((profilesQuery.data as { user_id: string; display_name: string }[] | null) ?? []).map(
      (profile) => [profile.user_id, profile.display_name],
    ),
  )
  const guideLinks: Loaded["guideLinks"] = {}
  for (const row of (guideQuery.data as
    | { id: string; name: string; source_reply_id: string | null }[]
    | null) ?? []) {
    if (row.source_reply_id) guideLinks[row.source_reply_id] = { id: row.id, name: row.name }
  }

  return {
    kind: "done",
    viewerId: user.id,
    request,
    replies,
    names,
    saved: Boolean(savedQuery.data),
    guideLinks,
  }
}

// "editada" da pergunta: `edited_at` só é escrito quando o CONTEÚDO muda — o
// gatilho `recommendation_requests_mark_edited` separa edição de resolução.
function isEdited(request: Pick<RequestRow, "edited_at">): boolean {
  return request.edited_at !== null
}

export function IndicationDetail({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [state, setState] = useState<LoadState>({ kind: "loading" })
  const [draft, setDraft] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState("")
  const [now] = useState(() => new Date())
  const replyId = useId()
  // Moderação e ações raras ficam no menu de mais opções (DS-006): um único
  // modal de denúncia, apontado para o pedido ou para a resposta escolhida.
  const reportModal = useOverlayState()
  const [reportTarget, setReportTarget] = useState<{
    type: ReportTargetType
    id: string
    authorId: string
  } | null>(null)
  const openReport = (type: ReportTargetType, id: string, authorId: string) => {
    setReportTarget({ type, id, authorId })
    reportModal.open()
  }

  // Edição e exclusão da autoria (manage.js): um modal para o texto e um para a
  // confirmação destrutiva, que sempre diz o que sai junto.
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EditTarget | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editBody, setEditBody] = useState("")
  const [editError, setEditError] = useState("")

  const reload = useCallback(async () => {
    setState(await loadIndication(requestId))
  }, [requestId])

  useEffect(() => {
    void reload()
  }, [reload])

  async function run(
    key: string,
    operation: WriteOperation,
    call: () => PromiseLike<{ error: { message: string } | null }>,
  ) {
    setBusy(key)
    setFeedback("")
    const { error } = await call()
    setBusy(null)
    if (error) {
      setFeedback(writeFailure(operation, error.message))
      return false
    }
    await reload()
    return true
  }

  if (state.kind === "loading") {
    return (
      <div
        className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 sm:pt-6 lg:px-8"
        aria-busy="true"
      >
        <Skeleton className="h-6 w-32 rounded-ui" />
        <Skeleton className="h-40 w-full rounded-ui-lg" />
        <Skeleton className="h-24 w-full rounded-ui-lg" />
      </div>
    )
  }

  if (state.kind === "error") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-4 sm:pt-6 lg:px-8">
        <ErrorState message={state.message} onRetry={() => void reload()} />
      </div>
    )
  }

  if (state.kind === "missing") {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 pt-4 sm:pt-6 lg:px-8">
        <EmptyState
          title="Este pedido não está disponível"
          description="Ele pode ter sido excluído por quem perguntou ou ser de um grupo do qual você não participa."
          action={
            <Link href={INDICATIONS_HREF as Route} className="text-sm font-semibold text-ui-brand">
              Ver as indicações da cidade
            </Link>
          }
        />
      </div>
    )
  }

  const { request, replies, names, viewerId, saved, guideLinks } = state
  const supabase = createBrowserClient()
  const isAuthor = request.author_id === viewerId
  const resolvedLabel = resolutionLabel(request.is_resolved, request.resolved_reply_id)
  const statusLabel =
    resolvedLabel ??
    indicationStatusLabel({ is_resolved: request.is_resolved, reply_count: replies.length })
  // O destaque da resposta que resolveu vem do ESTADO DA PERGUNTA, nunca so do
  // ponteiro: um estado {is_resolved: false, resolved_reply_id: "x"} nao pode
  // aparecer como resolvido (ADR-20261023, secao 2).
  const resolvedReply = request.is_resolved
    ? (replies.find((reply) => reply.id === request.resolved_reply_id) ?? null)
    : null
  const nameOf = (userId: string) => names[userId] ?? "Membro"

  function openEditQuestion() {
    setEditTitle(request.title)
    setEditBody(request.body)
    setEditError("")
    setEditTarget({ kind: "question" })
  }

  function openEditReply(reply: ReplyRow) {
    setEditBody(reply.body ?? "")
    setEditError("")
    setEditTarget({ kind: "reply", reply })
  }

  function openDelete(target: EditTarget) {
    setDeleteTarget(target)
  }

  async function submitEdit() {
    if (!editTarget) return
    if (editTarget.kind === "question") {
      const problem = titleProblem(editTitle)
      if (problem) {
        setEditError(problem)
        return
      }
      const ok = await run("edit-question", "editar_pergunta", () =>
        supabase
          .from("recommendation_requests")
          .update({ title: editTitle.trim(), body: editBody.trim() })
          .eq("id", request.id)
          .eq("author_id", viewerId),
      )
      if (ok) {
        setEditTarget(null)
      }
      if (!ok) setEditError(WRITE_FAILURE_COPY.editar_pergunta)
      return
    }
    const body = editBody.trim()
    if (body.length < REPLY_MIN) {
      setEditError(`Escreva uma resposta com pelo menos ${REPLY_MIN} caracteres.`)
      return
    }
    const reply = editTarget.reply
    const ok = await run(`edit-reply:${reply.id}`, "editar_resposta", () =>
      supabase
        .from("recommendation_replies")
        .update({ body })
        .eq("id", reply.id)
        .eq("author_id", viewerId),
    )
    if (ok) {
      setEditTarget(null)
    }
    if (!ok) setEditError(WRITE_FAILURE_COPY.editar_resposta)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    const ok =
      target.kind === "question"
        ? await run("delete-question", "excluir_pergunta", () =>
            supabase
              .from("recommendation_requests")
              .delete()
              .eq("id", request.id)
              .eq("author_id", viewerId),
          )
        : await run(`delete:${target.reply.id}`, "excluir_resposta", () =>
            supabase
              .from("recommendation_replies")
              .delete()
              .eq("id", target.reply.id)
              .eq("author_id", viewerId),
          )
    if (!ok) return
    setDeleteTarget(null)
    if (target.kind === "question") router.push(INDICATIONS_HREF as Route)
  }

  async function sendReply() {
    const body = draft.trim()
    if (body.length < REPLY_MIN) {
      setFeedback(`Escreva uma resposta com pelo menos ${REPLY_MIN} caracteres.`)
      return
    }
    const ok = await run("reply", "responder_pedido", () =>
      supabase
        .from("recommendation_replies")
        .insert({ request_id: request.id, author_id: viewerId, body }),
    )
    if (ok) setDraft("")
  }

  const deleteReplyCount = replies.length
  const deletingReply = deleteTarget?.kind === "reply" ? deleteTarget.reply : null
  const deleteIsMarked = request.is_resolved && deletingReply?.id === request.resolved_reply_id

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 pt-4 pb-10 sm:pt-6 lg:px-8">
      <Link
        href={INDICATIONS_HREF as Route}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ui-brand"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Indicações
      </Link>

      <article className="rounded-ui-lg bg-ui-surface p-4 shadow-ui ring-1 ring-ui-line sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-ui-ink-2">
            {categoryLabel(request.category)} · {relativeAge(request.created_at, now)} ·{" "}
            {nameOf(request.author_id)}
            {isEdited(request) ? " · editada" : ""}
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
              request.is_resolved ? "bg-ui-brand-soft text-ui-brand" : "bg-ui-subtle text-ui-ink"
            }`}
          >
            {statusLabel}
          </span>
        </div>
        <h1 className="mt-1 text-xl leading-snug font-semibold tracking-tight text-ui-ink">
          {request.title}
        </h1>
        {request.body ? (
          <p className="mt-2 text-sm whitespace-pre-line text-ui-ink-2">{request.body}</p>
        ) : null}

        {resolvedReply && !resolvedReply.is_removed ? (
          <div className="mt-4 rounded-ui bg-ui-brand-soft p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ui-brand">
              <CheckCircle2 size={14} aria-hidden="true" />
              Ajudou a resolver · resposta de {nameOf(resolvedReply.author_id ?? "")}
            </p>
            <p className="mt-1 text-sm whitespace-pre-line text-ui-ink">{resolvedReply.body}</p>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            isPending={busy === "save"}
            onPress={() =>
              void run("save", saved ? "remover_pedido_salvo" : "salvar_pedido", () =>
                saved
                  ? supabase
                      .from("recommendation_saves")
                      .delete()
                      .eq("user_id", viewerId)
                      .eq("request_id", request.id)
                  : supabase
                      .from("recommendation_saves")
                      .insert({ user_id: viewerId, request_id: request.id }),
              )
            }
          >
            {saved ? (
              <BookmarkCheck size={16} aria-hidden="true" />
            ) : (
              <Bookmark size={16} aria-hidden="true" />
            )}
            {saved ? "Seguindo respostas" : "Seguir respostas"}
          </Button>
          <div className="ml-auto">
            <ConversationMenu
              targetId={request.id}
              sharePath={indicationHref(request.id)}
              menuLabel="Ações do pedido"
              triggerLabel={overflowTriggerLabel("do pedido", request.title)}
              onEdit={isAuthor ? openEditQuestion : undefined}
              onResolve={
                isAuthor && !request.is_resolved
                  ? () =>
                      void run("resolve-question", "resolver_pergunta", () =>
                        callResolutionRpc(supabase, "mark_recommendation_resolved", {
                          p_request_id: request.id,
                        }),
                      )
                  : undefined
              }
              onReopen={
                isAuthor && request.is_resolved
                  ? () =>
                      void run("reopen", "reabrir_pedido", () =>
                        callResolutionRpc(supabase, "reopen_recommendation", {
                          p_request_id: request.id,
                        }),
                      )
                  : undefined
              }
              onDelete={isAuthor ? () => openDelete({ kind: "question" }) : undefined}
              labels={{
                edit: "Editar pergunta",
                resolve: "Marcar como resolvida",
                reopen: "Reabrir pergunta",
                share: "Compartilhar pedido",
                delete: "Excluir pergunta",
                report: "Denunciar pedido",
              }}
              onReport={
                isAuthor
                  ? undefined
                  : () => openReport("recommendation_request", request.id, request.author_id)
              }
            />
          </div>
        </div>
      </article>

      {feedback ? (
        <p role="alert" className="text-sm text-ui-danger">
          {feedback}
        </p>
      ) : null}

      <section aria-labelledby={`${replyId}-titulo`} className="space-y-3">
        <h2 id={`${replyId}-titulo`} className="text-sm font-semibold text-ui-ink">
          Respostas
        </h2>

        {replies.length === 0 ? (
          <p className="text-sm text-ui-ink-2">
            A comunidade ainda não respondeu. Sua pergunta já está disponível. Você pode acompanhar
            as respostas por aqui.
          </p>
        ) : null}

        {isAuthor && !request.is_resolved && replies.length > 0 ? (
          <p className="text-sm text-ui-ink-2">
            Quando uma resposta resolver, toque em “Ajudou a resolver”. Ela fica guardada para quem
            procurar a mesma coisa depois.
          </p>
        ) : null}

        <ul className="space-y-3">
          {replies.map((reply) => {
            if (reply.is_removed) {
              return (
                <li
                  key={reply.id}
                  className="rounded-ui-lg bg-ui-surface p-4 ring-1 ring-ui-line"
                  data-testid="reply-removed"
                >
                  <p className="flex items-center gap-2 text-sm text-ui-ink-2">
                    <ShieldAlert size={16} aria-hidden="true" />
                    Resposta removida pela moderação.
                  </p>
                </li>
              )
            }
            const authorId = reply.author_id ?? ""
            const body = reply.body ?? ""
            const marked = request.is_resolved && reply.id === request.resolved_reply_id
            const guide = guideLinks[reply.id]
            const isOwnReply = authorId === viewerId
            return (
              <li
                key={reply.id}
                className={`rounded-ui-lg bg-ui-surface p-4 ring-1 ${marked ? "ring-2 ring-ui-brand" : "ring-ui-line"}`}
              >
                <div className="flex items-center gap-2">
                  <MemberAvatar
                    name={nameOf(authorId)}
                    src={`/api/avatar/${authorId}`}
                    size="sm"
                    className="h-8 w-8 text-xs"
                  />
                  <p className="min-w-0 text-sm">
                    <span className="font-semibold text-ui-ink">{nameOf(authorId)}</span>{" "}
                    <span className="text-ui-ink-2">
                      · {relativeAge(reply.created_at, now)}
                      {reply.edited_at ? " · editada" : ""}
                    </span>
                  </p>
                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    {marked ? (
                      <span className="flex items-center gap-1 rounded-full bg-ui-brand-soft px-2 py-0.5 text-xs font-semibold text-ui-brand">
                        <CheckCircle2 size={12} aria-hidden="true" />
                        Ajudou a resolver
                      </span>
                    ) : null}
                    <ConversationMenu
                      targetId={reply.id}
                      sharePath={indicationHref(request.id)}
                      menuLabel="Ações da resposta"
                      triggerLabel={overflowTriggerLabel("da resposta", body)}
                      onEdit={isOwnReply ? () => openEditReply(reply) : undefined}
                      onDelete={isOwnReply ? () => openDelete({ kind: "reply", reply }) : undefined}
                      labels={{
                        edit: "Editar resposta",
                        share: "Compartilhar pedido",
                        delete: "Excluir resposta",
                        report: "Denunciar resposta",
                      }}
                      onReport={
                        isOwnReply
                          ? undefined
                          : () => openReport("recommendation_reply", reply.id, authorId)
                      }
                    />
                  </div>
                </div>
                <p className="mt-2 text-sm whitespace-pre-line text-ui-ink">{body}</p>
                {guide ? (
                  <Link
                    href={`/guide/${guide.id}` as Route}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-ui-brand"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    {guide.name} no Guia
                  </Link>
                ) : null}
                {isAuthor ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {!marked ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        isPending={busy === `mark:${reply.id}`}
                        // Uma por resposta: o nome diz qual, começando pelo
                        // rótulo visível (WCAG 2.5.3).
                        aria-label={`Ajudou a resolver: resposta de ${nameOf(authorId)}, ${accessibleSuffix(body)}`}
                        onPress={() =>
                          void run(`mark:${reply.id}`, "marcar_resposta", () =>
                            callResolutionRpc(supabase, "mark_recommendation_reply_resolved", {
                              p_request_id: request.id,
                              p_reply_id: reply.id,
                            }),
                          )
                        }
                      >
                        <CheckCircle2 size={16} aria-hidden="true" />
                        Ajudou a resolver
                      </Button>
                    ) : null}
                    {marked ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        isPending={busy === `reopen:${reply.id}`}
                        aria-label={`Reabrir pergunta: resposta de ${nameOf(authorId)}, ${accessibleSuffix(body)}`}
                        onPress={() =>
                          void run(`reopen:${reply.id}`, "reabrir_pedido", () =>
                            callResolutionRpc(supabase, "reopen_recommendation", {
                              p_request_id: request.id,
                            }),
                          )
                        }
                      >
                        Reabrir pergunta
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>

        {!request.is_resolved ? (
          <div className="rounded-ui-lg bg-ui-surface p-4 ring-1 ring-ui-line">
            <h3 className="text-sm font-semibold text-ui-ink">Compartilhe uma indicação</h3>
            <label htmlFor={replyId} className="mt-2 block text-sm font-medium text-ui-ink">
              {isAuthor ? "Complementar o pedido" : "Sua resposta"}
            </label>
            <TextArea
              id={replyId}
              value={draft}
              onChange={(event) =>
                setDraft((event.target as HTMLTextAreaElement).value.slice(0, REPLY_MAX))
              }
              placeholder={
                isAuthor
                  ? "Acrescente algo para quem for responder…"
                  : "Quem você indica, onde fica, como falar com a pessoa…"
              }
              rows={3}
              className="mt-2 w-full"
            />
            <div className="mt-3 flex justify-end">
              <Button
                variant="primary"
                isPending={busy === "reply"}
                onPress={() => void sendReply()}
              >
                Enviar indicação
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <Modal
        isOpen={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>
                  {editTarget?.kind === "reply" ? "Editar resposta" : "Editar pergunta"}
                </Modal.Heading>
                <ModalCloseTrigger className="min-h-11 min-w-11" />
              </Modal.Header>
              <Modal.Body>
                {editTarget?.kind === "reply" ? (
                  <>
                    <label htmlFor="edit-resposta" className="mb-1 block text-sm font-medium">
                      Sua resposta
                    </label>
                    <TextArea
                      id="edit-resposta"
                      value={editBody}
                      maxLength={REPLY_MAX}
                      onChange={(event) => setEditBody((event.target as HTMLTextAreaElement).value)}
                    />
                  </>
                ) : (
                  <>
                    <label htmlFor="edit-pergunta" className="mb-1 block text-sm font-medium">
                      Sua pergunta
                    </label>
                    <TextArea
                      id="edit-pergunta"
                      value={editTitle}
                      maxLength={INDICATION_TITLE_MAX}
                      onChange={(event) =>
                        setEditTitle((event.target as HTMLTextAreaElement).value)
                      }
                    />
                    <p className="mt-1 text-xs text-ui-ink-2">
                      {editTitle.trim().length} de {INDICATION_TITLE_MAX} caracteres
                    </p>
                    <label htmlFor="edit-detalhes" className="mt-4 mb-1 block text-sm font-medium">
                      Detalhes (opcional)
                    </label>
                    <TextArea
                      id="edit-detalhes"
                      value={editBody}
                      onChange={(event) => setEditBody((event.target as HTMLTextAreaElement).value)}
                    />
                  </>
                )}
                {editError ? (
                  <p role="alert" className="mt-3 text-sm text-ui-danger">
                    {editError}
                  </p>
                ) : null}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="tertiary"
                  onPress={() => {
                    setEditTarget(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  isPending={
                    busy === "edit-question" ||
                    (editTarget?.kind === "reply" && busy === `edit-reply:${editTarget.reply.id}`)
                  }
                  onPress={() => void submitEdit()}
                >
                  Salvar
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>
                  {deleteTarget?.kind === "reply" ? "Excluir resposta?" : "Excluir pergunta?"}
                </Modal.Heading>
                <ModalCloseTrigger className="min-h-11 min-w-11" />
              </Modal.Header>
              <Modal.Body>
                {deleteTarget?.kind === "reply" ? (
                  <p className="text-sm">
                    Ela sai desta pergunta. Isso não pode ser desfeito.
                    {deleteIsMarked ? " A pergunta volta a ficar sem solução." : ""}
                  </p>
                ) : (
                  <p className="text-sm">
                    {deleteReplyCount > 0
                      ? `A pergunta e ${deleteReplyCount === 1 ? "a resposta saem" : `as ${deleteReplyCount} respostas saem`} da comunidade. `
                      : "A pergunta sai da comunidade. "}
                    Isso não pode ser desfeito.
                  </p>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="tertiary"
                  onPress={() => {
                    setDeleteTarget(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  isPending={
                    busy === "delete-question" ||
                    (deleteTarget?.kind === "reply" && busy === `delete:${deleteTarget.reply.id}`)
                  }
                  onPress={() => void confirmDelete()}
                >
                  Excluir
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {reportTarget ? (
        <ReportButton
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          blockUserId={reportTarget.authorId}
          externalState={reportModal}
        />
      ) : null}
    </div>
  )
}
