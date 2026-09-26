"use client"

import { Button, TextArea, useOverlayState } from "@heroui/react"
import { ArrowLeft, Bookmark, BookmarkCheck, CheckCircle2, ExternalLink } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useCallback, useEffect, useId, useState } from "react"
import {
  categoryLabel,
  INDICATIONS_HREF,
  type IndicationCategory,
  indicationHref,
  indicationStatus,
  relativeAge,
  STATUS_LABELS,
} from "../../../lib/indications/indications"
import { callResolutionRpc } from "../../../lib/recommendations/resolution-rpcs"
import { accessibleSuffix, overflowTriggerLabel } from "../../../lib/recommendations/trigger-label"
import {
  readFailure,
  type WriteOperation,
  writeFailure,
} from "../../../lib/recommendations/write-failure-copy"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "../bivaque/avatar"
import { EmptyState } from "../bivaque/empty-state"
import { ErrorState } from "../bivaque/error-state"
import { LeanOverflowMenu } from "../bivaque/feed-post-menu"
import { ReportButton, type ReportTargetType } from "../bivaque/report-button"
import { Skeleton } from "../bivaque/skeleton"

// A conversa de um pedido de indicação. O gesto que dá memória à cidade é o de
// quem perguntou: "Ajudou a resolver" guarda a resposta junto do pedido, e é ela
// que aparece para quem procurar a mesma coisa depois.

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
  is_resolved: boolean
  resolved_reply_id: string | null
}

type ReplyRow = { id: string; author_id: string; body: string; created_at: string }

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
      "id, author_id, group_id, title, body, category, created_at, is_resolved, resolved_reply_id",
    )
    .eq("id", requestId)
    .maybeSingle()
  if (requestQuery.error) {
    return { kind: "error", message: readFailure("carregar_pedidos", requestQuery.error.message) }
  }
  if (!requestQuery.data) return { kind: "missing" }
  const request = requestQuery.data as RequestRow

  const [repliesQuery, savedQuery] = await Promise.all([
    supabase
      .from("recommendation_replies")
      .select("id, author_id, body, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true }),
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
  const replies = (repliesQuery.data as ReplyRow[] | null) ?? []

  // Nome e vínculo com o Guia são enfeite: se falharem, a conversa continua.
  const authorIds = [...new Set([request.author_id, ...replies.map((reply) => reply.author_id)])]
  const [profilesQuery, guideQuery] = await Promise.all([
    supabase.from("profiles").select("user_id, display_name").in("user_id", authorIds),
    replies.length > 0
      ? supabase
          .from("arrival_guide_entries")
          .select("id, name, source_reply_id")
          .in(
            "source_reply_id",
            replies.map((reply) => reply.id),
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

export function IndicationDetail({ requestId }: { requestId: string }) {
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
  const status = indicationStatus({ is_resolved: request.is_resolved, reply_count: replies.length })
  const resolvedReply = replies.find((reply) => reply.id === request.resolved_reply_id) ?? null
  const nameOf = (userId: string) => names[userId] ?? "Membro"

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
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
              status === "resolvido" ? "bg-ui-brand-soft text-ui-brand" : "bg-ui-subtle text-ui-ink"
            }`}
          >
            {status === "resolvido" ? "Resolvida pela autora" : STATUS_LABELS[status]}
          </span>
        </div>
        <h1 className="mt-1 text-xl leading-snug font-semibold tracking-tight text-ui-ink">
          {request.title}
        </h1>
        {request.body ? (
          <p className="mt-2 text-sm whitespace-pre-line text-ui-ink-2">{request.body}</p>
        ) : null}

        {resolvedReply ? (
          <div className="mt-4 rounded-ui bg-ui-brand-soft p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ui-brand">
              <CheckCircle2 size={14} aria-hidden="true" />
              Ajudou a resolver · resposta de {nameOf(resolvedReply.author_id)}
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
            {saved ? "Salvo" : "Salvar"}
          </Button>
          <div className="ml-auto">
            <LeanOverflowMenu
              postId={request.id}
              sharePath={indicationHref(request.id)}
              menuLabel="Ações do pedido"
              triggerLabel={overflowTriggerLabel("do pedido", request.title)}
              labels={{
                share: "Compartilhar pedido",
                report: "Denunciar pedido",
                reopen: "Reabrir pedido",
              }}
              onReport={
                isAuthor
                  ? undefined
                  : () => openReport("recommendation_request", request.id, request.author_id)
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
          {replies.length === 0
            ? "Nenhuma resposta ainda"
            : `${replies.length} ${replies.length === 1 ? "resposta" : "respostas"}`}
        </h2>

        {isAuthor && !request.is_resolved && replies.length > 0 ? (
          <p className="text-sm text-ui-ink-2">
            Quando uma resposta resolver, toque em “Ajudou a resolver”. Ela fica guardada para quem
            procurar a mesma coisa depois.
          </p>
        ) : null}

        <ul className="space-y-3">
          {replies.map((reply) => {
            const marked = reply.id === request.resolved_reply_id
            const guide = guideLinks[reply.id]
            const isOwnReply = reply.author_id === viewerId
            return (
              <li
                key={reply.id}
                className={`rounded-ui-lg bg-ui-surface p-4 ring-1 ${marked ? "ring-2 ring-ui-brand" : "ring-ui-line"}`}
              >
                <div className="flex items-center gap-2">
                  <MemberAvatar
                    name={nameOf(reply.author_id)}
                    src={`/api/avatar/${reply.author_id}`}
                    size="sm"
                    className="h-8 w-8 text-xs"
                  />
                  <p className="min-w-0 text-sm">
                    <span className="font-semibold text-ui-ink">{nameOf(reply.author_id)}</span>{" "}
                    <span className="text-ui-ink-2">· {relativeAge(reply.created_at, now)}</span>
                  </p>
                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    {marked ? (
                      <span className="flex items-center gap-1 rounded-full bg-ui-brand-soft px-2 py-0.5 text-xs font-semibold text-ui-brand">
                        <CheckCircle2 size={12} aria-hidden="true" />
                        Ajudou a resolver
                      </span>
                    ) : null}
                    <LeanOverflowMenu
                      postId={reply.id}
                      sharePath={indicationHref(request.id)}
                      menuLabel="Ações da resposta"
                      triggerLabel={overflowTriggerLabel("da resposta", reply.body)}
                      labels={{
                        share: "Compartilhar pedido",
                        report: "Denunciar resposta",
                        delete: "Excluir resposta",
                      }}
                      onReport={
                        isOwnReply
                          ? undefined
                          : () => openReport("recommendation_reply", reply.id, reply.author_id)
                      }
                      onDelete={
                        isOwnReply
                          ? () =>
                              void run(`delete:${reply.id}`, "excluir_resposta", () =>
                                supabase
                                  .from("recommendation_replies")
                                  .delete()
                                  .eq("id", reply.id)
                                  .eq("author_id", viewerId),
                              )
                          : undefined
                      }
                    />
                  </div>
                </div>
                <p className="mt-2 text-sm whitespace-pre-line text-ui-ink">{reply.body}</p>
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
                        aria-label={`Ajudou a resolver: resposta de ${nameOf(reply.author_id)}, ${accessibleSuffix(reply.body)}`}
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
                        isPending={busy === "clear"}
                        onPress={() =>
                          void run("clear", "limpar_marca", () =>
                            callResolutionRpc(supabase, "clear_recommendation_resolved_reply", {
                              p_request_id: request.id,
                            }),
                          )
                        }
                      >
                        Remover marca
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>

        <div className="rounded-ui-lg bg-ui-surface p-4 ring-1 ring-ui-line">
          <label htmlFor={replyId} className="text-sm font-semibold text-ui-ink">
            {isAuthor ? "Complementar o pedido" : "Sua indicação"}
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
            <Button variant="primary" isPending={busy === "reply"} onPress={() => void sendReply()}>
              Responder
            </Button>
          </div>
        </div>
      </section>

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
