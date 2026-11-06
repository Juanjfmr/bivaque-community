import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { ehUuid } from "../../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/** Mostra de novo o que a sessão ocultou (F10). Mesmas regras do bloqueio. */
export async function DELETE(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "nao-encontrado" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    const { data, error } = await auth.sessao.cliente
      .from("hidden_questions")
      .delete()
      .eq("user_id", userId)
      .eq("request_id", id)
      .select("request_id")
    if (error) throw error
    if ((data ?? []).length === 0) return responder(request, { erro: "nao-encontrado" }, 404)
    return responder(request, { removido: true }, 200)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
