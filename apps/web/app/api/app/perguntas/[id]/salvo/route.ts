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
 * Seguir respostas (F04): salvar e seguir são a MESMA ação — uma linha em
 * `recommendation_saves`, a mesma tabela que a web antiga usa e que já notifica
 * quem salvou quando aparece resposta (migration 20260821000012).
 *
 * A pergunta é conferida antes da escrita para que "não existe para você" seja
 * 404 e não o 403 genérico da policy. A exceção real é o pedido de grupo: ele é
 * visível, mas `recommendation_saves_insert_own` só aceita pedido da cidade —
 * o banco recusa com 42501 e a rota traduz em 403 com uma frase que diz isso.
 */
async function perguntaVisivel(client: SupabaseClient<Database>, id: string): Promise<boolean> {
  const result = await client
    .from("recommendation_requests")
    .select("id")
    .eq("id", id)
    .eq("is_deleted", false)
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
  if (!ehUuid(id)) return responder(request, { erro: "pergunta-nao-encontrada" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    if (!(await perguntaVisivel(client, id))) {
      return responder(request, { erro: "pergunta-nao-encontrada" }, 404)
    }
    const result = await client
      .from("recommendation_saves")
      .insert({ user_id: userId, request_id: id })
    // Seguir duas vezes é o mesmo estado, não um erro: a tela pediu "seguindo" e
    // é isso que ela lê de volta.
    if (result.error && result.error.code !== "23505") {
      const falha = interpretarErroDoBanco(result.error.code, {
        recusado: "Perguntas de grupo ainda não podem ser seguidas pela sua conta.",
        dados: "Não foi possível seguir esta pergunta.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw result.error
    }
    return responder(request, { salvo: true }, 200)
  } catch (error) {
    log.error("app pergunta: save failed", {
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
  if (!ehUuid(id)) return responder(request, { erro: "pergunta-nao-encontrada" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    // Só o DELETE dispensa a pergunta existir: remover o próprio seguimento é
    // sempre permitido (policy `recommendation_saves_delete_own`), inclusive de
    // pergunta que saiu do ar. A RLS já limita ao próprio `user_id`.
    const result = await client.from("recommendation_saves").delete().eq("request_id", id)
    if (result.error) throw result.error
    return responder(request, { salvo: false }, 200)
  } catch (error) {
    log.error("app pergunta: unsave failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
