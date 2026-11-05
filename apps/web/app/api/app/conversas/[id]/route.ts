import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { conversaDaSessao, cursorDe, mensagemDaLinha, nomeDaConversa, UUID } from "../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Contexto = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!UUID.test(id)) return responder(request, { erro: "nao-encontrado" }, 404)
  const bruto = new URL(request.url).searchParams.get("antes")
  const cursor = cursorDe(bruto)
  if (bruto !== null && cursor === null) return responder(request, { erro: "cursor-invalido" }, 400)
  try {
    const client = auth.sessao.cliente
    const conversa = await conversaDaSessao(client, id)
    if (!conversa) return responder(request, { erro: "nao-encontrado" }, 404)
    let query = client
      .from("dm_messages")
      .select("id,content,sender_id,created_at")
      .eq("conversation_id", id)
    if (cursor)
      query = query.or(
        `created_at.lt."${cursor.data}",and(created_at.eq."${cursor.data}",id.lt.${cursor.id})`,
      )
    const [nome, resultado] = await Promise.all([
      nomeDaConversa(client, id),
      query.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(51),
    ])
    if (resultado.error) throw resultado.error
    const pagina = (resultado.data ?? []).slice(0, 50)
    const ultima = pagina.at(-1)
    return responder(
      request,
      {
        conversa: { id, nome, tipo: conversa.context_type, contextoId: conversa.context_id },
        mensagens: pagina.reverse().map((linha) => mensagemDaLinha(linha, auth.sessao.usuario.id)),
        anterior:
          (resultado.data?.length ?? 0) > 50 && ultima ? `${ultima.created_at}|${ultima.id}` : null,
      },
      200,
    )
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
