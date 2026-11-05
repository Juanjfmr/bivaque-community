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
import { situacaoDoCorpo } from "../../../../../../lib/events/event-rsvp"
import { log } from "../../../../../../lib/logger"
import { cidadeDaSessao, ehUuid, encontroDaSessao, interpretarErroDoBanco } from "../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

// Presença é de quem é da cidade do encontro. O encontro de outra cidade ABRE
// para leitura (migration 20260925161111), mas confirmar, trocar ou cancelar
// presença continua barrado — aqui antes de ir ao banco, e de novo na RLS.

async function responderPresenca(
  request: NextRequest,
  client: SupabaseClient<Database>,
  id: string,
  date: string,
  minha: string | null,
): Promise<NextResponse> {
  const { count, error } = await client
    .from("event_rsvps")
    .select("event_id", { count: "exact", head: true })
    .eq("event_id", id)
    .eq("occurrence_date", date)
    .eq("status", "going")
  if (error) throw error
  return responder(request, { presenca: { confirmados: count ?? 0, minha } }, 200)
}

/** A situação de quem pede, já gravada. */
async function minhaPresenca(
  client: SupabaseClient<Database>,
  id: string,
  userId: string,
  date: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("event_rsvps")
    .select("status")
    .eq("event_id", id)
    .eq("user_id", userId)
    .eq("occurrence_date", date)
    .maybeSingle()
  if (error) throw error
  return data?.status ?? null
}

export async function PUT(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "evento-nao-encontrado" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Envie a presença em JSON." },
      400,
    )
  }
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  const situacao = situacaoDoCorpo(lido.corpo)
  if (situacao === null) {
    return responder(request, { erro: "dados-invalidos", mensagem: "Presença inválida." }, 400)
  }
  const client = auth.sessao.cliente
  const userId = auth.sessao.usuario.id
  try {
    const encontro = await encontroDaSessao(client, id)
    if (encontro === null) return responder(request, { erro: "evento-nao-encontrado" }, 404)
    const cidade = await cidadeDaSessao(client, userId)
    if (cidade === null || cidade.id !== encontro.locality_id) {
      return responder(request, { erro: "de-outra-cidade" }, 403)
    }
    const date = encontro.starts_at.slice(0, 10)
    const gravado = await client
      .from("event_rsvps")
      .upsert(
        { event_id: id, user_id: userId, status: situacao, occurrence_date: date },
        { onConflict: "event_id,user_id,occurrence_date" },
      )
    if (gravado.error) {
      // `P0001` aqui é o trigger que impede o organizador de confirmar presença
      // no próprio encontro — recusa com a frase da presença, não erro técnico.
      const falha = interpretarErroDoBanco(gravado.error.code, {
        recusado: "Você não pode confirmar presença neste encontro.",
        dados: "Escolha entre vou, não vou ou tenho interesse.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw gravado.error
    }
    return await responderPresenca(
      request,
      client,
      id,
      date,
      await minhaPresenca(client, id, userId, date),
    )
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
  if (!ehUuid(id)) return responder(request, { erro: "evento-nao-encontrado" }, 404)
  const client = auth.sessao.cliente
  const userId = auth.sessao.usuario.id
  try {
    const encontro = await encontroDaSessao(client, id)
    if (encontro === null) return responder(request, { erro: "evento-nao-encontrado" }, 404)
    const cidade = await cidadeDaSessao(client, userId)
    if (cidade === null || cidade.id !== encontro.locality_id) {
      return responder(request, { erro: "de-outra-cidade" }, 403)
    }
    const date = encontro.starts_at.slice(0, 10)
    const removido = await client
      .from("event_rsvps")
      .delete()
      .eq("event_id", id)
      .eq("user_id", userId)
      .eq("occurrence_date", date)
    if (removido.error) {
      const falha = interpretarErroDoBanco(removido.error.code, {
        recusado: "Você não pode cancelar presença neste encontro.",
        dados: "Não foi possível cancelar a presença.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw removido.error
    }
    return await responderPresenca(request, client, id, date, null)
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
