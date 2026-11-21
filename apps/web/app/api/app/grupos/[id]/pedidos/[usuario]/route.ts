import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../../lib/app-api/rota-do-app"
import { ehUuid } from "../../../../eventos/_comum"
import { resultado } from "../../_admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string; usuario: string }> }
export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id, usuario } = await params
  const lido = await lerCorpoJson(request)
  const decisao = lido.ok ? lido.corpo["decisao"] : undefined
  if (!ehUuid(id) || !ehUuid(usuario) || (decisao !== "aprovar" && decisao !== "recusar"))
    return responder(request, { erro: "dados-invalidos" }, 400)
  try {
    const client = auth.sessao.cliente
    const { data, error } =
      decisao === "aprovar"
        ? await client.rpc("approve_group_member", { p_group_id: id, p_user_id: usuario })
        : await client
            .from("group_memberships")
            .delete()
            .eq("group_id", id)
            .eq("user_id", usuario)
            .eq("status", "pending")
            .select("user_id")
    if (decisao === "recusar" && !error && Array.isArray(data) && data.length === 0)
      return responder(request, { erro: "nao-encontrado" }, 404)
    return resultado(request, error)
  } catch (error) {
    return resultado(request, (error ?? {}) as { code?: string; message?: string })
  }
}
export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
