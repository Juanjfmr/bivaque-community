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

/**
 * Desfaz o bloqueio de UMA pessoa (F10). O `id` só escolhe a linha: quem apaga
 * é `blocker_user_id` da sessão, e a policy confere de novo. Id fora do formato
 * ou linha que não existe para esta pessoa é 404 — nunca 403, que confirmaria
 * a existência do bloqueio alheio.
 */
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
      .from("dm_blocks")
      .delete()
      .eq("blocker_user_id", userId)
      .eq("blocked_user_id", id)
      .select("blocked_user_id")
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
