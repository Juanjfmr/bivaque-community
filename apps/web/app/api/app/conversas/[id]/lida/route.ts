import { type NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { UUID } from "../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Contexto = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!UUID.test(id)) return responder(request, { erro: "id-invalido" }, 400)
  try {
    const { error } = await auth.sessao.cliente.rpc("mark_conversation_read", {
      p_conversation_id: id,
    })
    if (error?.code === "42501") return responder(request, { erro: "nao-encontrado" }, 404)
    if (error) throw error
    const resposta = responder(request, {}, 200)
    return new NextResponse(null, { status: 204, headers: resposta.headers })
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
