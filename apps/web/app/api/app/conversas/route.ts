import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../lib/app-api/rota-do-app"
import { cursorDe, nomeDaConversa } from "./_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const url = new URL(request.url)
  const bruto = url.searchParams.get("depois")
  const cursor = cursorDe(bruto)
  if (bruto !== null && cursor === null) return responder(request, { erro: "cursor-invalido" }, 400)
  try {
    const client = auth.sessao.cliente
    let query = client.from("dm_conversations").select("id,context_type,context_id,created_at")
    if (cursor)
      query = query.or(
        `created_at.lt."${cursor.data}",and(created_at.eq."${cursor.data}",id.lt.${cursor.id})`,
      )
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(21)
    if (error) throw error
    const pagina = (data ?? []).slice(0, 20)
    const conversas = await Promise.all(
      pagina.map(async (linha) => {
        const [nome, ultima] = await Promise.all([
          nomeDaConversa(client, linha.id),
          client
            .from("dm_messages")
            .select("content")
            .eq("conversation_id", linha.id)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])
        if (ultima.error) throw ultima.error
        return {
          id: linha.id,
          nome,
          tipo: linha.context_type,
          contextoId: linha.context_id,
          ultima: ultima.data?.content ?? "",
        }
      }),
    )
    const ultima = pagina.at(-1)
    return responder(
      request,
      {
        conversas,
        proximo: (data?.length ?? 0) > 20 && ultima ? `${ultima.created_at}|${ultima.id}` : null,
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
