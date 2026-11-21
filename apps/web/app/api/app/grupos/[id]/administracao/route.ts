import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { ehUuid } from "../../../eventos/_comum"
import { resultado } from "../_admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }
export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "dados-invalidos" }, 400)
  const lido = await lerCorpoJson(request)
  const valor = lido.ok ? lido.corpo["para"] : undefined
  if (typeof valor !== "string" || !ehUuid(valor))
    return responder(request, { erro: "dados-invalidos" }, 400)
  try {
    const { error } = await auth.sessao.cliente.rpc("transfer_group_ownership", {
      p_group_id: id,
      p_new_owner_user_id: valor,
    })
    return resultado(request, error)
  } catch (error) {
    return resultado(request, (error ?? {}) as { code?: string; message?: string })
  }
}
export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
