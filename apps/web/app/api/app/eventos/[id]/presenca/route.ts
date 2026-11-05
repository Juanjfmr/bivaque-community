import type { SupabaseClient } from "@supabase/supabase-js"
import type { NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function presence(
  request: NextRequest,
  client: SupabaseClient<Database>,
  id: string,
  date: string,
  mine: string | null,
): Promise<NextResponse> {
  const result = await client
    .from("event_rsvps")
    .select("event_id", { count: "exact", head: true })
    .eq("event_id", id)
    .eq("occurrence_date", date)
    .eq("status", "going")
  if (result.error) throw result.error
  return responder(request, { presenca: { confirmados: result.count ?? 0, minha: mine } }, 200)
}

async function eventDate(client: SupabaseClient<Database>, id: string) {
  const result = await client.from("events").select("starts_at").eq("id", id).maybeSingle()
  if (result.error) throw result.error
  return result.data?.starts_at.slice(0, 10) ?? null
}

export async function PUT(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!UUID.test(id)) return responder(request, { erro: "evento-nao-encontrado" }, 404)
  const body = await lerCorpoJson(request)
  if (!body.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  const status = body.corpo["situacao"]
  if (status !== "going" && status !== "not_going" && status !== "interested")
    return responder(request, { erro: "dados-invalidos" }, 400)
  const client = auth.sessao.cliente
  const userId = auth.sessao.usuario.id
  try {
    const date = await eventDate(client, id)
    if (!date) return responder(request, { erro: "evento-nao-encontrado" }, 404)
    const result = await client
      .from("event_rsvps")
      .upsert(
        { event_id: id, user_id: userId, status, occurrence_date: date },
        { onConflict: "event_id,user_id,occurrence_date" },
      )
    if (result.error?.code === "42501") return responder(request, { erro: "recusado" }, 403)
    if (result.error) throw result.error
    const mine = await client
      .from("event_rsvps")
      .select("status")
      .eq("event_id", id)
      .eq("user_id", userId)
      .eq("occurrence_date", date)
      .maybeSingle()
    if (mine.error) throw mine.error
    return await presence(request, client, id, date, mine.data?.status ?? null)
  } catch (error) {
    log.error("app evento presence: write failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export async function DELETE(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!UUID.test(id)) return responder(request, { erro: "evento-nao-encontrado" }, 404)
  const client = auth.sessao.cliente
  const userId = auth.sessao.usuario.id
  try {
    const date = await eventDate(client, id)
    if (!date) return responder(request, { erro: "evento-nao-encontrado" }, 404)
    const result = await client
      .from("event_rsvps")
      .delete()
      .eq("event_id", id)
      .eq("user_id", userId)
      .eq("occurrence_date", date)
    if (result.error) throw result.error
    return await presence(request, client, id, date, null)
  } catch (error) {
    log.error("app evento presence: delete failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
