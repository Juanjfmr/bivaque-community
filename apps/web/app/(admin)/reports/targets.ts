// RECON-011 — modelo da fila de denúncias (prancha 58).
//
// Duas metades num só módulo, de propósito: as funções puras (parse, filtro,
// ordenação, rótulo curto, mapeamento da decisão) são o que o teste unitário
// cobre sem banco; `resolveTargets` é a única porta para o service_role e
// nunca inventa valor — consulta que falha deixa o campo nulo e registra o
// erro, e o consumidor renderiza o estado honesto ("não encontrado").
//
// O `reports.target_id` é polimórfico e sem FK, então o PostgREST não resolve
// embed aqui (mesma razão que produziu o RPC `list_open_reports`, migration
// 20260821000035). Para a fila inteira isso custa uma consulta por tipo de
// alvo, em lote — nunca um UUID cru na tela do operador.

import { log } from "../../../lib/logger"
import type { createServerClient } from "../../../lib/supabase/server"

type ServiceClient = ReturnType<typeof createServerClient>

export type Tab = "em-analise" | "concluidas"

export type Ordem = "antigas" | "recentes"

export const TARGET_LABELS: Record<string, string> = {
  post: "Publicação",
  comment: "Comentário",
  group: "Grupo",
  message: "Mensagem privada",
  recommendation_request: "Pedido de indicação",
  recommendation_reply: "Resposta de indicação",
}

export const SEM_COMUNIDADE = "__sem-comunidade__"

export interface QueueFilters {
  tab: Tab
  tipo: string | null
  comunidade: string | null
  motivo: string
  ordem: Ordem
  pagina: number
}

export interface ReportRow {
  id: string
  target_type: string
  target_id: string
  reason: string
  created_at: string
  status: "open" | "resolved"
  resolved_at: string | null
  operator_note: string | null
  excerpt: string | null
  authorName: string | null
  communityName: string | null
  contentCreatedAt: string | null
  openReportsOnTarget: number
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function parseQueueParams(params: {
  [key: string]: string | string[] | undefined
}): QueueFilters {
  const tab: Tab = firstParam(params["aba"]) === "concluidas" ? "concluidas" : "em-analise"

  const tipoRaw = firstParam(params["tipo"])?.trim()
  const tipo = tipoRaw && tipoRaw.length > 0 ? tipoRaw : null

  const comunidadeRaw = firstParam(params["comunidade"])?.trim()
  const comunidade = comunidadeRaw && comunidadeRaw.length > 0 ? comunidadeRaw.slice(0, 120) : null

  const motivo = (firstParam(params["motivo"]) ?? "").trim().slice(0, 120)

  const ordem: Ordem = firstParam(params["ordem"]) === "recentes" ? "recentes" : "antigas"

  const parsedPage = Number.parseInt(firstParam(params["pagina"]) ?? "1", 10)
  const pagina = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

  return { tab, tipo, comunidade, motivo, ordem, pagina }
}

// Rótulo curto a partir da primeira linha real do conteúdo. Nunca gera texto
// quando não há conteúdo: quem consome decide o estado vazio honesto.
export function shortLabel(text: string | null | undefined, max = 48): string {
  if (!text) return ""
  const line = text
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find((part) => part.length > 0)
  if (!line) return ""
  return line.length > max ? `${line.slice(0, max).trimEnd()}…` : line
}

export function truncateReason(reason: string, max = 90): string {
  const clean = reason.trim()
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean
}

// O veredito é humano: a única tradução aceita entre a escolha da pessoa e o
// mecanismo que já existe (`resolve_report`). Qualquer outro valor — inclusive
// vazio — não produz ação.
export function decisionToAction(decision: FormDataEntryValue | null): "hide" | "dismiss" | null {
  if (decision === "manter") return "dismiss"
  if (decision === "ocultar") return "hide"
  return null
}

export function applyFilters(rows: ReportRow[], filters: QueueFilters): ReportRow[] {
  let out = rows

  if (filters.tipo !== null) {
    out = out.filter((row) => row.target_type === filters.tipo)
  }
  if (filters.comunidade !== null) {
    out = out.filter((row) =>
      filters.comunidade === SEM_COMUNIDADE
        ? row.communityName === null
        : row.communityName === filters.comunidade,
    )
  }
  if (filters.motivo.length > 0) {
    const needle = filters.motivo.toLocaleLowerCase("pt-BR")
    out = out.filter((row) => row.reason.toLocaleLowerCase("pt-BR").includes(needle))
  }

  return [...out].sort((a, b) => {
    const delta = Date.parse(a.created_at) - Date.parse(b.created_at)
    return filters.ordem === "recentes" ? -delta : delta
  })
}

export const PAGE_SIZE = 10

export interface PagedRows {
  rows: ReportRow[]
  total: number
  totalPages: number
  page: number
  firstShown: number
  lastShown: number
}

export function paginateRows(rows: ReportRow[], pagina: number, pageSize = PAGE_SIZE): PagedRows {
  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(pagina, totalPages)
  const visible = rows.slice((page - 1) * pageSize, page * pageSize)
  return {
    rows: visible,
    total,
    totalPages,
    page,
    firstShown: total === 0 ? 0 : (page - 1) * pageSize + 1,
    lastShown: (page - 1) * pageSize + visible.length,
  }
}

export function countLabel(paged: PagedRows): string {
  if (paged.totalPages === 1) {
    return `Mostrando ${paged.total} de ${paged.total} denúncias`
  }
  return `Mostrando ${paged.firstShown}–${paged.lastShown} de ${paged.total} denúncias`
}

export function pageWindow(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
}

export function formatDate(iso: string | null): string {
  if (!iso) return "data indisponível"
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? "data indisponível"
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

export function isOverSla(created_at: string, nowMs: number, slaHours: number): boolean {
  const at = Date.parse(created_at)
  if (Number.isNaN(at)) return false
  return nowMs - at > slaHours * 60 * 60 * 1000
}

export interface TargetRef {
  target_type: string
  target_id: string
}

export interface TargetInfo {
  content: string | null
  authorName: string | null
  communityName: string | null
  contentCreatedAt: string | null
}

const EMPTY_TARGET: TargetInfo = {
  content: null,
  authorName: null,
  communityName: null,
  contentCreatedAt: null,
}

function distinct(values: readonly (string | null | undefined)[] | undefined): string[] {
  return [
    ...new Set((values ?? []).filter((v): v is string => typeof v === "string" && v.length > 0)),
  ]
}

interface QueryResult<T> {
  data: T | null
  error: { message: string } | null
}

function noteFailure(context: string, error: { message: string } | null): void {
  if (error) {
    // Registrar e seguir com o que existe: um tipo de alvo indisponível não
    // pode virar valor inventado nem derrubar a fila inteira.
    log.error("fila de denúncias: consulta de alvo falhou", { context, error: error.message })
  }
}

export async function resolveTargets(
  client: ServiceClient,
  refs: TargetRef[],
): Promise<Map<string, TargetInfo>> {
  const out = new Map<string, TargetInfo>()
  if (refs.length === 0) return out

  const idsByType = new Map<string, string[]>()
  for (const ref of refs) {
    const list = idsByType.get(ref.target_type) ?? []
    list.push(ref.target_id)
    idsByType.set(ref.target_type, list)
  }

  const postIds = idsByType.get("post") ?? []
  const commentIds = idsByType.get("comment") ?? []
  const groupIds = idsByType.get("group") ?? []
  const messageIds = idsByType.get("message") ?? []
  const requestIds = idsByType.get("recommendation_request") ?? []
  const replyIds = idsByType.get("recommendation_reply") ?? []

  const [posts, comments, groups, messages, requests, replies] = await Promise.all([
    (async (): Promise<
      QueryResult<
        {
          id: string
          content: string
          user_id: string
          group_id: string | null
          community_id: string | null
          created_at: string
        }[]
      >
    > => {
      if (postIds.length === 0) return { data: null, error: null }
      const { data, error } = await client
        .from("posts")
        .select("id, content, user_id, group_id, community_id, created_at")
        .in("id", postIds)
      noteFailure("posts", error)
      return { data: data ?? null, error }
    })(),
    (async (): Promise<
      QueryResult<
        { id: string; content: string; user_id: string; post_id: string; created_at: string }[]
      >
    > => {
      if (commentIds.length === 0) return { data: null, error: null }
      const { data, error } = await client
        .from("comments")
        .select("id, content, user_id, post_id, created_at")
        .in("id", commentIds)
      noteFailure("comments", error)
      return { data: data ?? null, error }
    })(),
    (async (): Promise<
      QueryResult<
        {
          id: string
          name: string
          owner_user_id: string
          community_id: string | null
          created_at: string
        }[]
      >
    > => {
      if (groupIds.length === 0) return { data: null, error: null }
      const { data, error } = await client
        .from("groups")
        .select("id, name, owner_user_id, community_id, created_at")
        .in("id", groupIds)
      noteFailure("groups", error)
      return { data: data ?? null, error }
    })(),
    (async (): Promise<
      QueryResult<{ id: string; content: string; sender_id: string; created_at: string }[]>
    > => {
      if (messageIds.length === 0) return { data: null, error: null }
      const { data, error } = await client
        .from("dm_messages")
        .select("id, content, sender_id, created_at")
        .in("id", messageIds)
      noteFailure("dm_messages", error)
      return { data: data ?? null, error }
    })(),
    (async (): Promise<
      QueryResult<
        {
          id: string
          title: string
          author_id: string
          group_id: string | null
          created_at: string
        }[]
      >
    > => {
      if (requestIds.length === 0) return { data: null, error: null }
      const { data, error } = await client
        .from("recommendation_requests")
        .select("id, title, author_id, group_id, created_at")
        .in("id", requestIds)
      noteFailure("recommendation_requests", error)
      return { data: data ?? null, error }
    })(),
    (async (): Promise<
      QueryResult<
        { id: string; body: string; author_id: string; request_id: string; created_at: string }[]
      >
    > => {
      if (replyIds.length === 0) return { data: null, error: null }
      const { data, error } = await client
        .from("recommendation_replies")
        .select("id, body, author_id, request_id, created_at")
        .in("id", replyIds)
      noteFailure("recommendation_replies", error)
      return { data: data ?? null, error }
    })(),
  ])

  // Segunda perna: escopo transitivo (comentário → post; resposta → pedido).
  const commentPostIds = distinct(comments.data?.map((c) => c.post_id) ?? [])
  const replyRequestIds = distinct(replies.data?.map((r) => r.request_id) ?? [])

  const [commentPosts, replyRequests] = await Promise.all([
    (async (): Promise<
      QueryResult<{ id: string; group_id: string | null; community_id: string | null }[]>
    > => {
      if (commentPostIds.length === 0) return { data: null, error: null }
      const { data, error } = await client
        .from("posts")
        .select("id, group_id, community_id")
        .in("id", commentPostIds)
      noteFailure("posts-de-comentario", error)
      return { data: data ?? null, error }
    })(),
    (async (): Promise<QueryResult<{ id: string; group_id: string | null }[]>> => {
      if (replyRequestIds.length === 0) return { data: null, error: null }
      const { data, error } = await client
        .from("recommendation_requests")
        .select("id, group_id")
        .in("id", replyRequestIds)
      noteFailure("pedidos-de-resposta", error)
      return { data: data ?? null, error }
    })(),
  ])

  // Grupo é sempre degrau para comunidade: o nome exibido é o de `communities`,
  // nunca o do grupo, para o segmento "Comunidade".
  const groupIdsToLook = distinct([
    ...(groups.data?.map((g) => g.id) ?? []),
    ...(posts.data?.map((p) => p.group_id) ?? []),
    ...(commentPosts.data?.map((p) => p.group_id) ?? []),
    ...(requests.data?.map((r) => r.group_id) ?? []),
    ...(replyRequests.data?.map((r) => r.group_id) ?? []),
  ])
  const groupIdsMissing = groupIdsToLook.filter(
    (id) => !(groups.data ?? []).some((g) => g.id === id),
  )

  let groupScopes: { id: string; community_id: string | null }[] = (groups.data ?? []).map((g) => ({
    id: g.id,
    community_id: g.community_id,
  }))
  if (groupIdsMissing.length > 0) {
    const { data, error } = await client
      .from("groups")
      .select("id, community_id")
      .in("id", groupIdsMissing)
    noteFailure("escopo-de-grupo", error)
    groupScopes = [...groupScopes, ...(data ?? [])]
  }
  const groupScope = new Map(groupScopes.map((g) => [g.id, g.community_id]))

  const communityIds = distinct([
    ...(posts.data?.map((p) => p.community_id) ?? []),
    ...(groupScopes.map((g) => g.community_id) ?? []),
  ])
  let communityNames = new Map<string, string>()
  if (communityIds.length > 0) {
    const { data, error } = await client
      .from("communities")
      .select("id, name")
      .in("id", communityIds)
    noteFailure("comunidades", error)
    communityNames = new Map((data ?? []).map((c) => [c.id, c.name]))
  }
  const communityNameFor = (communityId: string | null): string | null =>
    communityId ? (communityNames.get(communityId) ?? null) : null

  const authorIds = distinct([
    ...(posts.data?.map((p) => p.user_id) ?? []),
    ...(comments.data?.map((c) => c.user_id) ?? []),
    ...(groups.data?.map((g) => g.owner_user_id) ?? []),
    ...(messages.data?.map((m) => m.sender_id) ?? []),
    ...(requests.data?.map((r) => r.author_id) ?? []),
    ...(replies.data?.map((r) => r.author_id) ?? []),
  ])
  let authorNames = new Map<string, string>()
  if (authorIds.length > 0) {
    const { data, error } = await client
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", authorIds)
    noteFailure("perfis", error)
    authorNames = new Map((data ?? []).map((p) => [p.user_id, p.display_name]))
  }

  const postScope = new Map((posts.data ?? []).map((p) => [p.id, p]))
  const requestScope = new Map((requests.data ?? []).map((r) => [r.id, r]))

  for (const ref of refs) {
    if (out.has(ref.target_id)) continue
    switch (ref.target_type) {
      case "post": {
        const row = postScope.get(ref.target_id)
        if (!row) break
        out.set(ref.target_id, {
          content: row.content,
          authorName: authorNames.get(row.user_id) ?? null,
          communityName:
            communityNameFor(row.community_id) ??
            communityNameFor(row.group_id ? (groupScope.get(row.group_id) ?? null) : null),
          contentCreatedAt: row.created_at,
        })
        break
      }
      case "comment": {
        const row = comments.data?.find((c) => c.id === ref.target_id)
        if (!row) break
        const post =
          postScope.get(row.post_id) ?? commentPosts.data?.find((p) => p.id === row.post_id)
        out.set(ref.target_id, {
          content: row.content,
          authorName: authorNames.get(row.user_id) ?? null,
          communityName: post
            ? (communityNameFor(post.community_id) ??
              communityNameFor(post.group_id ? (groupScope.get(post.group_id) ?? null) : null))
            : null,
          contentCreatedAt: row.created_at,
        })
        break
      }
      case "group": {
        const row = groups.data?.find((g) => g.id === ref.target_id)
        if (!row) break
        out.set(ref.target_id, {
          content: row.name,
          authorName: authorNames.get(row.owner_user_id) ?? null,
          communityName: communityNameFor(row.community_id),
          contentCreatedAt: row.created_at,
        })
        break
      }
      case "message": {
        const row = messages.data?.find((m) => m.id === ref.target_id)
        if (!row) break
        out.set(ref.target_id, {
          content: row.content,
          authorName: authorNames.get(row.sender_id) ?? null,
          communityName: null,
          contentCreatedAt: row.created_at,
        })
        break
      }
      case "recommendation_request": {
        const row = requestScope.get(ref.target_id)
        if (!row) break
        out.set(ref.target_id, {
          content: row.title,
          authorName: authorNames.get(row.author_id) ?? null,
          communityName: communityNameFor(
            row.group_id ? (groupScope.get(row.group_id) ?? null) : null,
          ),
          contentCreatedAt: row.created_at,
        })
        break
      }
      case "recommendation_reply": {
        const row = replies.data?.find((r) => r.id === ref.target_id)
        if (!row) break
        const request =
          requestScope.get(row.request_id) ??
          replyRequests.data?.find((r) => r.id === row.request_id)
        out.set(ref.target_id, {
          content: row.body,
          authorName: authorNames.get(row.author_id) ?? null,
          communityName: request?.group_id
            ? communityNameFor(groupScope.get(request.group_id) ?? null)
            : null,
          contentCreatedAt: row.created_at,
        })
        break
      }
      default:
        break
    }
  }

  for (const ref of refs) {
    if (!out.has(ref.target_id)) out.set(ref.target_id, EMPTY_TARGET)
  }
  return out
}
