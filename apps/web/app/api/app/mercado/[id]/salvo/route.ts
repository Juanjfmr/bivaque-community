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
import { ehUuid, interpretarErroDoBanco } from "../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/**
 * Salvar e dessalvar um anúncio (LAN-F06): a linha de `listing_saves` é da
 * SESSÃO, nunca do corpo. A visibilidade é a da leitura sob RLS
 * (`private.can_read_listing`), então anúncio invisível volta 404 sem confirmar
 * que existe. Salvar duas vezes é o mesmo estado, não erro (23505). Desfazer o
 * próprio salvamento é sempre permitido — inclusive de anúncio que saiu do ar —
 * e apagar linha que não existe é 404, no molde do DELETE de bloqueados.
 */

async function anuncioVisivel(client: SupabaseClient<Database>, id: string): Promise<boolean> {
  const result = await client.from("listings").select("id").eq("id", id).maybeSingle()
  if (result.error) throw result.error
  return result.data !== null
}

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "anuncio-nao-encontrado" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    if (!(await anuncioVisivel(client, id))) {
      return responder(request, { erro: "anuncio-nao-encontrado" }, 404)
    }
    const result = await client.from("listing_saves").insert({ listing_id: id, user_id: userId })
    // Já salvo é o mesmo estado: a tela pediu "salvo" e é isso que ela lê de volta.
    if (result.error && result.error.code !== "23505") {
      const falha = interpretarErroDoBanco(result.error.code, {
        recusado: "Sua conta não pode salvar este anúncio.",
        dados: "Não foi possível salvar este anúncio.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw result.error
    }
    return responder(request, { salvo: true }, 200)
  } catch (error) {
    log.error("app mercado: save failed", {
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
  if (!ehUuid(id)) return responder(request, { erro: "anuncio-nao-encontrado" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    // O `user_id` do filtro é a sessão e a policy confere de novo (`listing_saves_delete_owner`):
    // salvar de outra pessoa não é apagável daqui, e a resposta não diz se existe.
    const { data, error } = await auth.sessao.cliente
      .from("listing_saves")
      .delete()
      .eq("listing_id", id)
      .eq("user_id", userId)
      .select("listing_id")
    if (error) throw error
    if ((data ?? []).length === 0) return responder(request, { erro: "salvo-nao-encontrado" }, 404)
    return responder(request, { salvo: false }, 200)
  } catch (error) {
    log.error("app mercado: unsave failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
