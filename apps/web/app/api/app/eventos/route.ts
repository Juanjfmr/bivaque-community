import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../lib/app-api/rota-do-app"
import {
  buildEventCreatePayload,
  eventInputFromBody,
  validateEventForm,
} from "../../../../lib/events/event-form"
import { log } from "../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const url = new URL(request.url)
  const rawLimit = url.searchParams.get("limite")
  const limit = rawLimit === null ? 20 : Number(rawLimit)
  const after = url.searchParams.get("depois")
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    (after !== null && (!Number.isFinite(Date.parse(after)) || !/^\d{4}-\d\d-\d\dT/.test(after)))
  )
    return responder(request, { erro: "corpo-invalido" }, 400)
  const client = auth.sessao.cliente
  const userId = auth.sessao.usuario.id
  try {
    const membership = await client
      .from("locality_memberships")
      .select("locality_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle()
    if (membership.error) throw membership.error
    if (!membership.data) return responder(request, { eventos: [], proximo: null }, 200)
    let query = client
      .from("events")
      .select("id,title,venue,starts_at,status")
      .eq("locality_id", membership.data.locality_id)
      .neq("status", "completed")
    query = after ? query.gt("starts_at", after) : query.gte("starts_at", new Date().toISOString())
    const result = await query.order("starts_at", { ascending: true }).limit(limit)
    if (result.error) throw result.error
    const eventos = (result.data ?? []).map((row) => ({
      id: row.id,
      titulo: row.title,
      local: row.venue,
      comecaEm: row.starts_at,
      situacao: row.status,
    }))
    return responder(
      request,
      { eventos, proximo: eventos.length === limit ? (eventos.at(-1)?.comecaEm ?? null) : null },
      200,
    )
  } catch (error) {
    log.error("app eventos: read failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
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
    const membership = await client
      .from("locality_memberships")
      .select("locality_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle()
    if (membership.error) throw membership.error
    if (!membership.data) return responder(request, { erro: "sem-cidade" }, 403)
    const result = await client
      .from("events")
      .insert(
        buildEventCreatePayload(input, {
          organizerId: userId,
          localityId: membership.data.locality_id,
        }),
      )
      .select("id")
      .single()
    if (result.error?.code === "42501") return responder(request, { erro: "recusado" }, 403)
    if (result.error || !result.data) throw result.error ?? new Error("insert without result")
    return responder(request, { evento: { id: result.data.id } }, 201)
  } catch (error) {
    log.error("app eventos: create failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
