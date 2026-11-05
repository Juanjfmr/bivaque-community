import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import {
  buildEventPayload,
  eventInputFromBody,
  validateEventForm,
} from "../../../../../lib/events/event-form"
import { log } from "../../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!UUID.test(id)) return responder(request, { erro: "evento-nao-encontrado" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const result = await client
      .from("events")
      .select("id,title,description,venue,starts_at,ends_at,status,cover_path,organizer_id")
      .eq("id", id)
      .maybeSingle()
    if (result.error) throw result.error
    if (!result.data) return responder(request, { erro: "evento-nao-encontrado" }, 404)
    const date = result.data.starts_at.slice(0, 10)
    const [counts, mine] = await Promise.all([
      client
        .from("event_rsvps")
        .select("event_id", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("occurrence_date", date)
        .eq("status", "going"),
      client
        .from("event_rsvps")
        .select("status")
        .eq("event_id", id)
        .eq("user_id", userId)
        .eq("occurrence_date", date)
        .maybeSingle(),
    ])
    if (counts.error || mine.error) throw counts.error ?? mine.error
    return responder(
      request,
      {
        evento: {
          id: result.data.id,
          titulo: result.data.title,
          descricao: result.data.description,
          local: result.data.venue,
          comecaEm: result.data.starts_at,
          terminaEm: result.data.ends_at,
          situacao: result.data.status,
          capa: result.data.cover_path,
        },
        presenca: { confirmados: counts.count ?? 0, minha: mine.data?.status ?? null },
        souOrganizador: result.data.organizer_id === userId,
      },
      200,
    )
  } catch (error) {
    log.error("app evento: read failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export async function PATCH(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!UUID.test(id)) return responder(request, { erro: "evento-nao-encontrado" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Envie os dados do evento em JSON." },
      400,
    )
  }
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  const input = eventInputFromBody(lido.corpo)
  if (!input)
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Dados do evento inválidos." },
      400,
    )
  const mensagem = validateEventForm(input)
  if (mensagem) return responder(request, { erro: "dados-invalidos", mensagem }, 400)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const current = await client.from("events").select("id,organizer_id").eq("id", id).maybeSingle()
    if (current.error) throw current.error
    if (!current.data) return responder(request, { erro: "evento-nao-encontrado" }, 404)
    if (current.data.organizer_id !== userId)
      return responder(request, { erro: "nao-organiza" }, 403)
    const result = await client
      .from("events")
      .update(buildEventPayload(input))
      .eq("id", id)
      .eq("organizer_id", userId)
      .select("id")
      .single()
    if (result.error || !result.data) throw result.error ?? new Error("update without result")
    return responder(request, { evento: { id: result.data.id } }, 200)
  } catch (error) {
    log.error("app evento: update failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
