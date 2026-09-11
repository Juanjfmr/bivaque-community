// RECON-030 — modelo do artigo do Guia (prancha 25), extensão de uma entrada
// do diretório `arrival_guide_entries`. As tabelas nascem na migration
// 20260910202110_guide_article.sql; enquanto ela não está aplicada no banco,
// `loadGuideArticle` degrada para "sem artigo" em vez de derrubar a rota —
// a entrada de diretório continua renderizando como antes.
//
// Os helpers puros (âncora, índice, detecção de relação ausente) são testados
// sem banco em tests/unit/guide/guide-article.test.ts.

import { log } from "../logger"

export type GuideArticleStatus = "draft" | "published" | "withdrawn"
export type GuideCorrectionStatus = "received" | "in_review" | "applied" | "rejected"

export interface GuideArticleSection {
  id: string
  position: number
  anchor: string
  title: string
  body: string
}

export interface GuideArticle {
  id: string
  entryId: string
  title: string
  subtitle: string | null
  coverImageUrl: string | null
  summary: string | null
  status: GuideArticleStatus
  reviewedAt: string | null
  sections: GuideArticleSection[]
}

export interface GuideTocItem {
  id: string
  anchor: string
  title: string
}

export interface GuideCorrectionRequest {
  id: string
  articleId: string
  sectionId: string | null
  requesterId: string
  description: string
  reference: string | null
  status: GuideCorrectionStatus
  decisionNote: string | null
  decidedAt: string | null
  createdAt: string
}

export interface GuideCorrectionQueueItem {
  request: GuideCorrectionRequest
  articleEntryId: string
  articleTitle: string
  articleSummary: string | null
  sectionTitle: string | null
  sectionBody: string | null
  requesterName: string
}

export const GUIDE_CORRECTION_STATUS_LABELS: Record<GuideCorrectionStatus, string> = {
  received: "Recebida",
  in_review: "Em análise",
  applied: "Aplicada",
  rejected: "Rejeitada",
}

export function correctionStatusLabel(status: string): string {
  if (status in GUIDE_CORRECTION_STATUS_LABELS) {
    return GUIDE_CORRECTION_STATUS_LABELS[status as GuideCorrectionStatus]
  }
  return "Status desconhecido"
}

// ── helpers puros ───────────────────────────────────────────────────────────

const SAFE_ANCHOR = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

export function isSafeAnchor(value: string): boolean {
  return value.length > 0 && value.length <= 80 && SAFE_ANCHOR.test(value)
}

// Deriva a âncora do título da seção. O índice usa exatamente esta âncora, e
// as âncoras são únicas por artigo (constraint no banco), então o título é
// normalizado de forma determinística.
export function slugifyAnchor(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "")
  return slug.length > 0 ? slug : "secao"
}

// O índice "Neste guia" é GERADO das seções — nunca um campo paralelo. Ordena
// por position e descarta âncora inválida (não deveria existir com o check do
// banco, mas o índice não pode emitir link quebrado).
export function buildGuideToc(sections: GuideArticleSection[]): GuideTocItem[] {
  return [...sections]
    .sort((a, b) => a.position - b.position)
    .filter((section) => isSafeAnchor(section.anchor))
    .map((section) => ({ id: section.id, anchor: section.anchor, title: section.title }))
}

// A migration pode ainda não estar aplicada no banco compartilhado. PostgREST
// sinaliza tabela ausente do cache de esquema com PGRST205; o Postgres usa
// 42P01. Só esses casos viram "sem artigo" — qualquer outro erro sobe.
export function isMissingRelationError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === "42P01" || error.code === "PGRST205") return true
  const message = error.message ?? ""
  return /schema cache|does not exist|could not find the table/i.test(message)
}

// ── leitura tipada sobre client sem genérico ────────────────────────────────
//
// As tabelas novas ainda não estão em supabase/database.generated.ts (a
// geração exige banco aplicado). A consulta passa por uma interface mínima e o
// resultado é convertido para os tipos acima — sem `any`.

interface SupabaseErrorLike {
  code?: string
  message: string
}

interface UntypedResponse<T> {
  data: T | null
  error: SupabaseErrorLike | null
}

interface UntypedQuery<T> extends PromiseLike<UntypedResponse<T>> {
  select(columns?: string): UntypedQuery<T>
  eq(column: string, value: unknown): UntypedQuery<T>
  in(column: string, values: readonly unknown[]): UntypedQuery<T>
  order(column: string, options?: { ascending?: boolean }): UntypedQuery<T>
  maybeSingle(): PromiseLike<UntypedResponse<T>>
  insert(values: Record<string, unknown>): UntypedInsertResult<T>
}

interface UntypedInsertResult<T> extends PromiseLike<UntypedResponse<T>> {
  select(columns?: string): {
    single(): PromiseLike<UntypedResponse<T>>
    maybeSingle(): PromiseLike<UntypedResponse<T>>
  }
}

interface UntypedClient {
  from(table: string): UntypedQuery<unknown>
}

interface ArticleRow {
  id: string
  entry_id: string
  title: string
  subtitle: string | null
  cover_image_url: string | null
  summary: string | null
  status: GuideArticleStatus
  reviewed_at: string | null
}

interface SectionRow {
  id: string
  article_id: string
  position: number
  anchor: string
  title: string
  body: string
}

interface CorrectionRow {
  id: string
  article_id: string
  section_id: string | null
  requester_id: string
  description: string
  reference: string | null
  status: GuideCorrectionStatus
  decision_note: string | null
  decided_at: string | null
  created_at: string
}

function mapSection(row: SectionRow): GuideArticleSection {
  return {
    id: row.id,
    position: row.position,
    anchor: row.anchor,
    title: row.title,
    body: row.body,
  }
}

function mapCorrection(row: CorrectionRow): GuideCorrectionRequest {
  return {
    id: row.id,
    articleId: row.article_id,
    sectionId: row.section_id,
    requesterId: row.requester_id,
    description: row.description,
    reference: row.reference,
    status: row.status,
    decisionNote: row.decision_note,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  }
}

export async function loadGuideArticle(
  supabase: unknown,
  entryId: string,
): Promise<GuideArticle | null> {
  const client = supabase as UntypedClient

  const articleResult = await client
    .from("guide_articles")
    .select("id, entry_id, title, subtitle, cover_image_url, summary, status, reviewed_at")
    .eq("entry_id", entryId)
    .eq("status", "published")
    .maybeSingle()

  if (articleResult.error) {
    if (isMissingRelationError(articleResult.error)) {
      log.warn("guide: article extension is not available in this database yet", {
        entry_id: entryId,
        code: articleResult.error.code ?? "unknown",
      })
      return null
    }
    throw new Error(`Falha ao carregar o artigo do guia: ${articleResult.error.message}`)
  }

  const row = articleResult.data as ArticleRow | null
  if (!row) return null

  const sectionsResult = await client
    .from("guide_article_sections")
    .select("id, article_id, position, anchor, title, body")
    .eq("article_id", row.id)
    .order("position", { ascending: true })

  if (sectionsResult.error) {
    if (isMissingRelationError(sectionsResult.error)) {
      log.warn("guide: article sections are not available in this database yet", {
        article_id: row.id,
        code: sectionsResult.error.code ?? "unknown",
      })
      return null
    }
    throw new Error(`Falha ao carregar as seções do guia: ${sectionsResult.error.message}`)
  }

  const sections = ((sectionsResult.data as SectionRow[] | null) ?? []).map(mapSection)

  return {
    id: row.id,
    entryId: row.entry_id,
    title: row.title,
    subtitle: row.subtitle,
    coverImageUrl: row.cover_image_url,
    summary: row.summary,
    status: row.status,
    reviewedAt: row.reviewed_at,
    sections,
  }
}

// Retorno ao solicitante: ele vê apenas as próprias sugestões (a RLS já impõe
// isso; o filtro por requester_id é defesa em profundidade).
export async function loadOwnCorrectionRequests(
  supabase: unknown,
  articleId: string,
  requesterId: string,
): Promise<GuideCorrectionRequest[]> {
  const client = supabase as UntypedClient

  const result = await client
    .from("guide_correction_requests")
    .select(
      "id, article_id, section_id, requester_id, description, reference, status, decision_note, decided_at, created_at",
    )
    .eq("article_id", articleId)
    .eq("requester_id", requesterId)
    .order("created_at", { ascending: false })

  if (result.error) {
    if (isMissingRelationError(result.error)) return []
    throw new Error(`Falha ao carregar suas sugestões: ${result.error.message}`)
  }

  return ((result.data as CorrectionRow[] | null) ?? []).map(mapCorrection)
}

export interface GuideCorrectionDraft {
  articleId: string
  sectionId: string | null
  requesterId: string
  description: string
  reference: string | null
}

// Enviar sugestão NÃO publica nada: cria uma linha em
// guide_correction_requests e a RLS exige requester_id = auth.uid(),
// artigo publicado e localidade do solicitante. A decisão é humana (D4).
export async function insertGuideCorrection(
  supabase: unknown,
  draft: GuideCorrectionDraft,
): Promise<{ id: string | null; error: SupabaseErrorLike | null }> {
  const client = supabase as UntypedClient

  const result = await client
    .from("guide_correction_requests")
    .insert({
      article_id: draft.articleId,
      section_id: draft.sectionId,
      requester_id: draft.requesterId,
      description: draft.description,
      reference: draft.reference,
    })
    .select("id")
    .single()

  if (result.error) return { id: null, error: result.error }
  const row = result.data as { id: string } | null
  return { id: row?.id ?? null, error: null }
}

// Fila da curadoria (service_role): sugestões ainda não decididas, com o
// contexto mínimo para decidir. Título de seção e nome do solicitante entram
// como texto exibido ao operador autorizado; nada de contato ou dado privado.
export async function loadGuideCorrectionQueue(
  supabase: unknown,
): Promise<GuideCorrectionQueueItem[]> {
  const client = supabase as UntypedClient

  const requestsResult = await client
    .from("guide_correction_requests")
    .select(
      "id, article_id, section_id, requester_id, description, reference, status, decision_note, decided_at, created_at",
    )
    .in("status", ["received", "in_review"])
    .order("created_at", { ascending: true })

  if (requestsResult.error) {
    if (isMissingRelationError(requestsResult.error)) return []
    throw new Error(`Falha ao carregar sugestões de correção: ${requestsResult.error.message}`)
  }

  const requests = ((requestsResult.data as CorrectionRow[] | null) ?? []).map(mapCorrection)
  if (requests.length === 0) return []

  const articleIds = Array.from(new Set(requests.map((request) => request.articleId)))
  const sectionIds = Array.from(
    new Set(requests.map((request) => request.sectionId).filter((id): id is string => id !== null)),
  )
  const requesterIds = Array.from(new Set(requests.map((request) => request.requesterId)))

  const articlesResult = await client
    .from("guide_articles")
    .select("id, entry_id, title, summary")
    .in("id", articleIds)
  if (articlesResult.error) {
    throw new Error(`Falha ao carregar os artigos das sugestões: ${articlesResult.error.message}`)
  }
  const articles = new Map(
    (
      (articlesResult.data as
        | { id: string; entry_id: string; title: string; summary: string | null }[]
        | null) ?? []
    ).map((article) => [article.id, article]),
  )

  const sections = new Map<string, { title: string; body: string }>()
  if (sectionIds.length > 0) {
    const sectionsResult = await client
      .from("guide_article_sections")
      .select("id, title, body")
      .in("id", sectionIds)
    if (sectionsResult.error) {
      throw new Error(`Falha ao carregar as seções das sugestões: ${sectionsResult.error.message}`)
    }
    for (const section of (sectionsResult.data as
      | { id: string; title: string; body: string }[]
      | null) ?? []) {
      sections.set(section.id, { title: section.title, body: section.body })
    }
  }

  const profilesResult = await client
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", requesterIds)
  if (profilesResult.error) {
    throw new Error(`Falha ao carregar os autores das sugestões: ${profilesResult.error.message}`)
  }
  const profiles = new Map(
    ((profilesResult.data as { user_id: string; display_name: string }[] | null) ?? []).map(
      (profile) => [profile.user_id, profile.display_name],
    ),
  )

  return requests.map((request) => {
    const article = articles.get(request.articleId)
    const section = request.sectionId ? sections.get(request.sectionId) : undefined
    return {
      request,
      articleEntryId: article?.entry_id ?? "",
      articleTitle: article?.title ?? "Artigo",
      articleSummary: article?.summary ?? null,
      sectionTitle: section?.title ?? null,
      sectionBody: section?.body ?? null,
      requesterName: profiles.get(request.requesterId) ?? "Membro",
    }
  })
}
