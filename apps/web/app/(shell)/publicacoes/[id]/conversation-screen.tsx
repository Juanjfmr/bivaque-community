"use client"

// A conversa da prancha 15 — detalhe de `recommendation_requests`. O chip
// "Resolvida pela autora", o "Guardar para depois" e o guia de chegada têm
// backing real; as curtidas desenhadas na prancha ficam fora por decisão do
// dono de 09/09 (divergência declarada no relatório do lote), e o marcador da
// resposta que ajudou a resolver vem pelo RECON-035. A linha de escopo, a
// contagem e a ordenação vêm de consulta — nunca de texto chumbado.

import { Button, Chip, ListBox, Select, TextArea } from "@heroui/react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { MemberAvatar } from "../../../components/bivaque/avatar"
import { AccessUnavailableState } from "../../../components/bivaque/empty-state"
import { ConnectionLostState } from "../../../components/bivaque/error-state"
import { formatRelativeTime } from "../../../components/bivaque/feed-post-shared"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { ReportButton } from "../../../components/bivaque/report-button"
import { Skeleton } from "../../../components/bivaque/skeleton"
import { showToast } from "../../../components/bivaque/toast"

interface ConversationData {
  request: {
    id: string
    author_id: string
    title: string
    body: string
    created_at: string
    is_resolved: boolean
    resolved_by: string | null
    locality_id: string | null
    group_id: string | null
  }
  authorName: string | null
  scopeName: string
  scopeIsCommunity: boolean
  communityId: string | null
  communityDescription: string | null
  cityLabel: string | null
  memberCount: number | null
  replies: Array<{
    id: string
    author_id: string
    body: string
    created_at: string
    authorName: string | null
  }>
  saved: boolean
  currentUserId: string
  currentUserName: string | null
}

type LoadState =
  | { status: "loading" }
  | { status: "network-error" }
  | { status: "no-access" }
  | { status: "ready"; data: ConversationData }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function ConversationScreen({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [state, setState] = useState<LoadState>({ status: "loading" })
  const [reloadToken, setReloadToken] = useState(0)
  const [order, setOrder] = useState<"recentes" | "antigas">("recentes")
  const [replyText, setReplyText] = useState("")
  const [replying, setReplying] = useState(false)
  const [replyError, setReplyError] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setState({ status: "loading" })
    if (!UUID_RE.test(requestId)) {
      setState({ status: "network-error" })
      return
    }
    const supabase = createBrowserClient()
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setState({ status: "network-error" })
        return
      }
      const { data: request, error: requestError } = await supabase
        .from("recommendation_requests")
        .select(
          "id, author_id, title, body, created_at, is_resolved, resolved_by, locality_id, group_id",
        )
        .eq("id", requestId)
        .eq("is_deleted", false)
        .maybeSingle()
      if (requestError) {
        setState({ status: "network-error" })
        return
      }
      if (!request) {
        setState({ status: "no-access" })
        return
      }
      const [authorProfile, myProfile, repliesResult, savesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", request.author_id)
          .maybeSingle(),
        supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("recommendation_replies")
          .select("id, author_id, body, created_at")
          .eq("request_id", requestId)
          .eq("is_deleted", false)
          .order("created_at", { ascending: true }),
        supabase
          .from("recommendation_saves")
          .select("request_id")
          .eq("user_id", user.id)
          .eq("request_id", requestId)
          .maybeSingle(),
      ])
      const replies = (repliesResult.data ?? []) as Array<{
        id: string
        author_id: string
        body: string
        created_at: string
      }>
      const authorIds = [...new Set(replies.map((r) => r.author_id))]
      const profilesResult =
        authorIds.length > 0
          ? await supabase.from("profiles").select("user_id, display_name").in("user_id", authorIds)
          : { data: [] as { user_id: string; display_name: string }[] }
      const names = new Map<string, string | null>(
        ((profilesResult.data ?? []) as { user_id: string; display_name: string }[]).map((p) => [
          p.user_id,
          p.display_name,
        ]),
      )
      names.set(
        request.author_id,
        (authorProfile.data as { display_name: string } | null)?.display_name ?? null,
      )

      let scopeName = ""
      let scopeIsCommunity = false
      let communityId: string | null = null
      let communityDescription: string | null = null
      let cityLabel: string | null = null
      let memberCount: number | null = null

      if (request.group_id) {
        const { data: group } = await supabase
          .from("groups")
          .select("name, community_id")
          .eq("id", request.group_id)
          .maybeSingle()
        scopeName = (group as { name: string } | null)?.name ?? "este grupo"
        communityId = (group as { community_id: string | null } | null)?.community_id ?? null
      } else if (request.locality_id) {
        const { data: locality } = await supabase
          .from("localities")
          .select("city_name, state_code")
          .eq("id", request.locality_id)
          .maybeSingle()
        cityLabel = locality
          ? `${(locality as { city_name: string }).city_name}, ${(locality as { state_code: string }).state_code}`
          : null
        scopeName = cityLabel ?? "toda a cidade"
      }
      if (communityId) {
        const [{ data: community }, myMembership, countResult] = await Promise.all([
          supabase
            .from("communities")
            .select("name, description, locality_id")
            .eq("id", communityId)
            .maybeSingle(),
          supabase
            .from("community_memberships")
            .select("status")
            .eq("community_id", communityId)
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("community_memberships")
            .select("user_id", { count: "exact", head: true })
            .eq("community_id", communityId)
            .eq("status", "approved"),
        ])
        if (community) {
          scopeName = (community as { name: string }).name
          scopeIsCommunity = true
          communityDescription = (community as { description: string | null }).description
        }
        const approved = (myMembership.data as { status: string } | null)?.status === "approved"
        memberCount = approved ? (countResult.count ?? 0) : null
      }

      setState({
        status: "ready",
        data: {
          request,
          authorName: names.get(request.author_id) ?? null,
          scopeName,
          scopeIsCommunity,
          communityId,
          communityDescription,
          cityLabel,
          memberCount,
          replies: replies.map((r) => ({ ...r, authorName: names.get(r.author_id) ?? null })),
          saved: savesResult.data !== null,
          currentUserId: user.id,
          currentUserName:
            (myProfile.data as { display_name: string | null } | null)?.display_name ?? null,
        },
      })
    } catch {
      setState({ status: "network-error" })
    }
  }, [requestId])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `reloadToken` é o gatilho do "Tentar novamente" — o corpo não o lê de propósito
  useEffect(() => {
    load()
  }, [load, reloadToken])

  async function toggleSave() {
    if (state.status !== "ready" || !state.data) return
    setSaving(true)
    const supabase = createBrowserClient()
    const next = !state.data.saved
    const result = next
      ? await supabase
          .from("recommendation_saves")
          .insert({ user_id: state.data.currentUserId, request_id: requestId })
      : await supabase
          .from("recommendation_saves")
          .delete()
          .eq("user_id", state.data.currentUserId)
          .eq("request_id", requestId)
    setSaving(false)
    if (result.error) {
      showToast({
        title: "Não foi possível guardar agora.",
        description: "Tente de novo em instantes.",
        variant: "danger",
      })
      return
    }
    setState({ status: "ready", data: { ...state.data, saved: next } })
  }

  async function submitReply() {
    if (state.status !== "ready" || !state.data) return
    const body = replyText.trim()
    if (body.length < 5) {
      setReplyError("Escreva uma resposta com pelo menos 5 caracteres.")
      return
    }
    setReplying(true)
    setReplyError("")
    const supabase = createBrowserClient()
    const { error } = await supabase.from("recommendation_replies").insert({
      request_id: requestId,
      author_id: state.data.currentUserId,
      body,
    })
    setReplying(false)
    if (error) {
      setReplyError("Não foi possível enviar a resposta agora. Tente novamente.")
      return
    }
    setReplyText("")
    await load()
  }

  function startReplyTo(name: string | null) {
    setReplyText(name ? `@${name} ` : "")
    document.getElementById("conversa-resposta")?.focus()
  }

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-4 px-4 py-8" aria-busy="true">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }
  if (state.status === "network-error") {
    return (
      <div className="px-4 py-8">
        <ConnectionLostState
          description="Não foi possível abrir esta conversa por falta de conexão. Verifique a internet e tente de novo."
          onRetry={() => setReloadToken((t) => t + 1)}
        />
      </div>
    )
  }
  if (state.status === "no-access") {
    return (
      <div className="px-4 py-8">
        <AccessUnavailableState
          title="Você ainda não tem acesso a esta comunidade."
          description="Saiba mais sobre esta comunidade para entender como participar e o que ela compartilha com seus membros."
          icon={<LockCircleGlyph />}
          primaryAction={
            <Button variant="primary" onPress={() => router.push("/communities")}>
              Conhecer comunidade
            </Button>
          }
          secondaryAction={
            <Button variant="secondary" onPress={() => router.back()}>
              Voltar
            </Button>
          }
        />
      </div>
    )
  }

  const { data } = state
  const isAuthor = data.request.author_id === data.currentUserId
  const resolvedByAuthor =
    data.request.is_resolved && data.request.resolved_by === data.request.author_id
  const sortedReplies = order === "recentes" ? [...data.replies].reverse() : [...data.replies]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <nav aria-label="Trilha" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link
              href="/communities"
              className="inline-flex min-h-11 items-center transition-colors hover:text-foreground"
            >
              Comunidades
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            {data.communityId ? (
              <Link
                href={`/communities/${data.communityId}` as Route}
                className="inline-flex min-h-11 items-center transition-colors hover:text-foreground"
              >
                {data.scopeName}
              </Link>
            ) : (
              <span>{data.scopeName}</span>
            )}
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            Conversa
          </li>
        </ol>
      </nav>

      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight break-words">{data.request.title}</h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <MemberAvatar name={data.authorName} size="sm" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{data.authorName ?? "Membro"}</span>
              <span className="text-xs text-muted">
                {formatRelativeTime(data.request.created_at)} · {data.scopeName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.request.is_resolved && (
              <Chip size="sm" variant="soft" color="success">
                ✓ {resolvedByAuthor ? "Resolvida pela autora" : "Resolvida"}
              </Chip>
            )}
            {!isAuthor && (
              <ReportButton
                targetType="recommendation_request"
                targetId={data.request.id}
                label="Denunciar"
                blockUserId={data.request.author_id}
              />
            )}
          </div>
        </div>
      </header>

      <p className="flex items-center gap-2 border-y border-border py-3 text-sm text-muted">
        <UsersGlyph />
        Esta conversa é para membros de {data.scopeName}.
      </p>

      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {data.request.body}
      </div>

      <section aria-labelledby="replies-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="replies-heading" className="text-base font-semibold tracking-tight">
            {data.replies.length} {data.replies.length === 1 ? "resposta" : "respostas"}
          </h2>
          <Select
            aria-label="Ordenar respostas"
            selectedKey={order}
            onSelectionChange={(key) => setOrder(key === "antigas" ? "antigas" : "recentes")}
            className="w-44"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item key="recentes" id="recentes">
                  Mais recentes
                </ListBox.Item>
                <ListBox.Item key="antigas" id="antigas">
                  Mais antigas
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        {sortedReplies.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhuma resposta ainda. Quem participa desta conversa pode responder abaixo.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sortedReplies.map((reply) => (
              <li key={reply.id}>
                <article className="flex flex-col gap-2 rounded-xl border border-border bg-[var(--semantic-surface)] p-4">
                  <div className="flex items-center gap-2.5">
                    <MemberAvatar name={reply.authorName} size="sm" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        {reply.authorName ?? "Membro"}
                      </span>
                      <span className="text-xs text-muted">
                        {formatRelativeTime(reply.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {reply.body}
                  </p>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="tertiary"
                      onPress={() => startReplyTo(reply.authorName)}
                    >
                      Responder
                    </Button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-[var(--semantic-surface)] p-4">
          <div className="flex items-start gap-3">
            <MemberAvatar name={data.currentUserName} size="sm" className="mt-1 shrink-0" />
            <TextArea
              id="conversa-resposta"
              aria-label="Sua resposta"
              rows={2}
              value={replyText}
              onChange={(e) => {
                setReplyText((e.target as HTMLTextAreaElement).value)
                setReplyError("")
              }}
              className="flex-1"
            />
          </div>
          {replyError ? <FeedbackAlert variant="danger" description={replyError} /> : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs text-muted">
              <UsersGlyph />
              Esta resposta será visível apenas para membros de {data.scopeName}.
            </p>
            <Button
              variant="primary"
              isDisabled={replying || replyText.trim().length < 5}
              onPress={submitReply}
            >
              {replying ? "Enviando…" : "Responder"}
            </Button>
          </div>
        </div>
      </section>

      <aside aria-label="Sobre esta conversa" className="flex flex-col gap-4">
        <article className="flex flex-col gap-3 rounded-xl border border-border bg-[var(--semantic-surface)] p-4">
          <h2 className="text-base font-semibold tracking-tight">{data.scopeName}</h2>
          <p className="text-sm text-muted">
            {data.cityLabel ??
              (data.scopeIsCommunity ? "Comunidade do Bivaque" : "Grupo do Bivaque")}
            {data.memberCount !== null &&
              ` · ${data.memberCount} ${data.memberCount === 1 ? "membro" : "membros"}`}
          </p>
          {data.communityDescription && (
            <p className="text-sm leading-relaxed">{data.communityDescription}</p>
          )}
          {data.communityId && (
            <Link
              href={`/communities/${data.communityId}`}
              className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--semantic-action-primary)] hover:underline"
            >
              Ver informações da comunidade ›
            </Link>
          )}
        </article>

        <article className="flex flex-col gap-2 rounded-xl border border-border bg-[var(--semantic-surface)] p-4">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <BookmarkGlyph />
            Guardar para depois
          </h2>
          <p className="text-sm text-muted">Salve esta conversa para consultar quando quiser.</p>
          <Button
            variant={data.saved ? "secondary" : "tertiary"}
            isDisabled={saving}
            onPress={toggleSave}
          >
            {saving ? "Salvando…" : data.saved ? "Guardado" : "Guardar"}
          </Button>
        </article>

        <article className="flex flex-col gap-2 rounded-xl border border-border bg-[var(--semantic-surface)] p-4">
          <h2 className="text-base font-semibold tracking-tight">Vai mudar de cidade?</h2>
          <p className="text-sm text-muted">
            Encontre serviços, guias e dicas para uma chegada mais tranquila.
          </p>
          <Link
            href="/guide"
            className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--semantic-action-primary)] hover:underline"
          >
            Ver guia de chegada ›
          </Link>
        </article>
      </aside>
    </div>
  )
}

function UsersGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function BookmarkGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5 text-[var(--semantic-action-primary)]"
    >
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function LockCircleGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-7 w-7"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}
