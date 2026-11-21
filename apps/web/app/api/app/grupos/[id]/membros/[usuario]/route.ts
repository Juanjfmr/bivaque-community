import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  opcoesDoApp,
  responder,
} from "../../../../../../../lib/app-api/rota-do-app"
import { ehUuid } from "../../../../eventos/_comum"
import { resultado } from "../../_admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string; usuario: string }> }
export async function DELETE(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id, usuario } = await params
  if (!ehUuid(id) || !ehUuid(usuario) || usuario === auth.sessao.usuario.id)
    return responder(request, { erro: "dados-invalidos" }, 400)
  try {
    const { data, error } = await auth.sessao.cliente
      .from("group_memberships")
      .delete()
      .eq("group_id", id)
      .eq("user_id", usuario)
      .eq("status", "approved")
      .select("user_id")
    if (!error && data.length === 0) return responder(request, { erro: "nao-encontrado" }, 404)
    return resultado(request, error)
  } catch (error) {
    return resultado(request, (error ?? {}) as { code?: string; message?: string })
  }
}
export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
