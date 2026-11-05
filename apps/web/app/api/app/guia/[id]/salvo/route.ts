import type { SupabaseClient } from "@supabase/supabase-js"
import type { NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import {
  conferirEscrita,
  exigirSessao,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../../lib/logger"
import { ehUuid, interpretarErroDoBanco } from "../../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/**
 * O marcador do guia (F08): grava e desgrava na `guide_entry_saves`, a mesma
 * tabela que a web antiga já usa. A policy de INSERT exige referência aprovada
 * da localidade de quem salva — a rota não repete a regra, ela confia na RLS.
 *
 * A entrada é conferida antes da escrita para que "não existe" seja 404 e não
 * o 403 genérico de uma policy. A resposta devolve o estado gravado, nunca o
 * que a tela esperava.
 */
async function entradaVisivel(client: SupabaseClient<Database>, id: string): Promise<boolean> {
  const result = await client
    .from("arrival_guide_entries")
    .select("id")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle()
  if (result.error) throw result.error
  return result.data !== null
}

export async function PUT(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "entrada-nao-encontrada" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    if (!(await entradaVisivel(client, id))) {
      return responder(request, { erro: "entrada-nao-encontrada" }, 404)
    }
    const result = await client.from("guide_entry_saves").insert({ user_id: userId, entry_id: id })
    // Salvar duas vezes é o mesmo estado, não um erro: a tela pediu "salvo" e é
    // isso que ela lê de volta.
    if (result.error && result.error.code !== "23505") {
      const falha = interpretarErroDoBanco(result.error.code, {
        recusado: "Esta referência não pode ser salva pela sua conta.",
        dados: "Não foi possível salvar esta referência.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw result.error
    }
    return responder(request, { salvo: true }, 200)
  } catch (error) {
    log.error("app guia: save failed", {
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
  if (!ehUuid(id)) return responder(request, { erro: "entrada-nao-encontrada" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    if (!(await entradaVisivel(client, id))) {
      return responder(request, { erro: "entrada-nao-encontrada" }, 404)
    }
    const result = await client.from("guide_entry_saves").delete().eq("entry_id", id)
    if (result.error) throw result.error
    return responder(request, { salvo: false }, 200)
  } catch (error) {
    log.error("app guia: unsave failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
