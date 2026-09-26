import { scrubReportReason } from "@bivaque/domain"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

// Prancha 56-web-confianca e spec C10: a denuncia do membro tem motivo de
// lista fechada — Spam, Conteúdo inadequado, Informação enganosa, Outro — e
// explicacao opcional com contador. `reports.reason` e um texto unico
// (20260802001600) e o contrato deste lote proibe migration, entao a
// categoria vive como prefixo legivel do motivo, no formato ja gravado pela
// UI do feed desde a RECON-016: "<Label>: <explicacao>". A tela de
// acompanhamento separa as duas metades aqui, e texto livre legado (fila do
// operador, denuncia de mensagem no chat) continua legivel como explicacao
// sem categoria.

export const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "conteudo-inadequado", label: "Conteúdo inadequado" },
  { value: "informacao-enganosa", label: "Informação enganosa" },
  { value: "outro", label: "Outro" },
] as const

export type ReportReasonValue = (typeof REPORT_REASONS)[number]["value"]

export const EXPLANATION_MAX = 300

export const REPORT_TARGET_TYPES = [
  "post",
  "comment",
  "group",
  "message",
  "recommendation_request",
  "recommendation_reply",
] as const satisfies readonly Database["public"]["Enums"]["report_target_type"][]

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number]

export const TARGET_PRESENTATION: Record<ReportTargetType, { title: string; question: string }> = {
  post: { title: "Denunciar publicação", question: "esta publicação" },
  comment: { title: "Denunciar comentário", question: "este comentário" },
  group: { title: "Denunciar comunidade", question: "esta comunidade" },
  message: { title: "Denunciar mensagem", question: "esta mensagem" },
  recommendation_request: { title: "Denunciar pedido", question: "este pedido" },
  recommendation_reply: { title: "Denunciar resposta", question: "esta resposta" },
}

const TARGET_LABELS: Record<ReportTargetType, string> = {
  post: "Publicação",
  comment: "Comentário",
  group: "Comunidade",
  message: "Mensagem",
  recommendation_request: "Pedido",
  recommendation_reply: "Resposta",
}

// Leitura do alvo pela RLS do proprio membro: existence check e preview na
// mesma consulta. Tipo fora da lista fechada nao tem consulta — recusa antes.
async function readTarget(
  supabase: Client,
  targetType: ReportTargetType,
  targetId: string,
): Promise<string | null> {
  switch (targetType) {
    case "post": {
      const { data } = await supabase
        .from("posts")
        .select("content")
        .eq("id", targetId)
        .maybeSingle()
      return (data as { content: string } | null)?.content ?? null
    }
    case "comment": {
      const { data } = await supabase
        .from("comments")
        .select("content")
        .eq("id", targetId)
        .maybeSingle()
      return (data as { content: string } | null)?.content ?? null
    }
    case "group": {
      const { data } = await supabase.from("groups").select("name").eq("id", targetId).maybeSingle()
      return (data as { name: string } | null)?.name ?? null
    }
    case "message": {
      const { data } = await supabase
        .from("dm_messages")
        .select("content")
        .eq("id", targetId)
        .maybeSingle()
      return (data as { content: string } | null)?.content ?? null
    }
    case "recommendation_request": {
      const { data } = await supabase
        .from("recommendation_requests")
        .select("title")
        .eq("id", targetId)
        .maybeSingle()
      return (data as { title: string } | null)?.title ?? null
    }
    case "recommendation_reply": {
      const { data } = await supabase
        .from("recommendation_replies")
        .select("content")
        .eq("id", targetId)
        .maybeSingle()
      return (data as { content: string } | null)?.content ?? null
    }
  }
}

export function isReportTargetType(value: string): value is ReportTargetType {
  return (REPORT_TARGET_TYPES as readonly string[]).includes(value)
}

export function reportReasonLabel(value: string): string | null {
  return REPORT_REASONS.find((reason) => reason.value === value)?.label ?? null
}

export function composeReason(label: string, explanation: string): string {
  const trimmed = explanation.trim()
  return scrubReportReason(trimmed.length > 0 ? `${label}: ${trimmed}` : label)
}

// Metades do motivo para a tela de acompanhamento (prancha 56: "Motivo da
// denuncia" e "Sua explicacao" em blocos separados). Prefixo que nao casa com
// a lista fechada e texto livre legado: vira explicacao, nunca categoria
// inventada.
export function splitReason(reason: string): { label: string; explanation: string | null } {
  if (REPORT_REASONS.some((item) => item.label === reason)) {
    return { label: reason, explanation: null }
  }
  const separator = reason.indexOf(": ")
  if (separator > 0) {
    const head = reason.slice(0, separator)
    if (REPORT_REASONS.some((item) => item.label === head)) {
      const tail = reason.slice(separator + 2).trim()
      return { label: head, explanation: tail.length > 0 ? tail : null }
    }
  }
  return { label: "Motivo registrado", explanation: reason }
}

export type ReportInput = {
  targetType: string
  targetId: string
  reason: string
  explanation: string
}

export type ReportMutationError =
  | "sessao-expirada"
  | "motivo-invalido"
  | "alvo-invalido"
  | "explicacao-longa"
  | "ja-denunciado"
  | "proprio-conteudo"
  | "falha"

// Aceita apenas o vocabulario fechado; qualquer outro valor — inclusive por
// chamada direta sem interface — e recusado antes de tocar o banco.
export function validateReportInput(
  input: Pick<ReportInput, "reason" | "explanation">,
): { ok: true; label: string; explanation: string } | { ok: false; error: ReportMutationError } {
  const label = reportReasonLabel(input.reason)
  if (!label) return { ok: false, error: "motivo-invalido" }
  const explanation = input.explanation.trim()
  if (explanation.length > EXPLANATION_MAX) return { ok: false, error: "explicacao-longa" }
  return { ok: true, label, explanation }
}

type Client = SupabaseClient<Database>

// O servidor confere o alvo pela leitura do proprio membro (RLS): linha que
// nao e visivel para ele nao e denunciavel por ele. Sem isso, qualquer uuid
// chutado entraria na fila do operador.
export async function validateReportTarget(
  supabase: Client,
  targetType: string,
  targetId: string,
): Promise<boolean> {
  if (!isReportTargetType(targetType)) return false
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
    return false
  }
  const preview = await readTarget(supabase, targetType, targetId)
  return preview !== null
}

export async function createReport(
  supabase: Client,
  input: ReportInput,
): Promise<{ ok: true; reportId: string } | { ok: false; error: ReportMutationError }> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "sessao-expirada" }

  const validated = validateReportInput(input)
  if (!validated.ok) return validated

  if (!(await validateReportTarget(supabase, input.targetType, input.targetId))) {
    return { ok: false, error: "alvo-invalido" }
  }

  const reason = composeReason(validated.label, validated.explanation)
  const { data, error } = await supabase
    .from("reports")
    .insert({
      target_type: input.targetType as Database["public"]["Enums"]["report_target_type"],
      target_id: input.targetId,
      reason,
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") return { ok: false, error: "ja-denunciado" }
    if (error.message.toLowerCase().includes("own content")) {
      return { ok: false, error: "proprio-conteudo" }
    }
    return { ok: false, error: "falha" }
  }
  return { ok: true, reportId: String((data as { id: string }).id) }
}

export type OwnReport = {
  id: string
  targetType: string
  targetLabel: string
  targetPreview: string | null
  targetHref: string | null
  reason: string
  status: "open" | "resolved"
  createdAt: string
  resolvedAt: string | null
}

const TARGET_HREF: Record<ReportTargetType, (id: string) => string | null> = {
  post: (id) => `/community?post=${id}`,
  comment: () => null,
  group: (id) => `/groups/${id}`,
  message: () => null,
  recommendation_request: (id) => `/indicacoes/${id}`,
  recommendation_reply: () => null,
}

type ReportRow = {
  id: string
  target_type: string
  target_id: string
  reason: string
  status: string
  created_at: string
  resolved_at: string | null
}

export async function listOwnReports(supabase: Client): Promise<OwnReport[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, status, created_at, resolved_at")
    .order("created_at", { ascending: false })
  if (error) throw new Error("reports-query-failed")
  return hydrateOwnReports(supabase, (data ?? []) as ReportRow[])
}

export async function getOwnReport(supabase: Client, reportId: string): Promise<OwnReport | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, status, created_at, resolved_at")
    .eq("id", reportId)
    .maybeSingle()
  if (error) throw new Error("reports-query-failed")
  if (!data) return null
  const [hydrated] = await hydrateOwnReports(supabase, [data as ReportRow])
  return hydrated ?? null
}

// O retorno ao denunciante contem apenas o que a prancha mostra: situacao,
// motivo e a propria explicacao. Resultado interno (nota do operador, acao
// hide/dismiss) e identidade de quem modera nao aparecem aqui — a RLS ja
// esconde as linhas alheias; a projecao abaixo esconde as colunas proprias.
async function hydrateOwnReports(supabase: Client, rows: ReportRow[]): Promise<OwnReport[]> {
  const previews = new Map<string, string | null>()
  await Promise.all(
    rows.map(async (row) => {
      if (!isReportTargetType(row.target_type)) return
      const key = `${row.target_type}:${row.target_id}`
      if (previews.has(key)) return
      previews.set(key, await readTarget(supabase, row.target_type, row.target_id))
    }),
  )

  return rows.map((row) => {
    const knownType: ReportTargetType | null = isReportTargetType(row.target_type)
      ? row.target_type
      : null
    const preview = knownType ? (previews.get(`${knownType}:${row.target_id}`) ?? null) : null
    return {
      id: row.id,
      targetType: row.target_type,
      targetLabel: knownType ? TARGET_LABELS[knownType] : "Conteúdo",
      targetPreview: preview,
      targetHref: knownType ? TARGET_HREF[knownType](row.target_id) : null,
      reason: row.reason,
      status: row.status === "resolved" ? "resolved" : "open",
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    }
  })
}

export type BlockedPerson = {
  userId: string
  displayName: string
  blockedAt: string
}

export async function listMyBlocks(supabase: Client): Promise<BlockedPerson[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from("dm_blocks")
    .select("blocked_user_id, created_at")
    .eq("blocker_user_id", user.id)
    .order("created_at", { ascending: false })
  if (error) throw new Error("blocks-query-failed")
  const rows = (data ?? []) as Array<{ blocked_user_id: string; created_at: string }>
  if (rows.length === 0) return []

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in(
      "user_id",
      rows.map((row) => row.blocked_user_id),
    )
  const names = new Map(
    ((profiles ?? []) as Array<{ user_id: string; display_name: string }>).map((profile) => [
      profile.user_id,
      profile.display_name,
    ]),
  )
  return rows.map((row) => ({
    userId: row.blocked_user_id,
    displayName: names.get(row.blocked_user_id) ?? "Membro",
    blockedAt: row.created_at,
  }))
}

export async function unblockPerson(supabase: Client, blockedUserId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  const { error } = await supabase
    .from("dm_blocks")
    .delete()
    .eq("blocker_user_id", user.id)
    .eq("blocked_user_id", blockedUserId)
  return !error
}
