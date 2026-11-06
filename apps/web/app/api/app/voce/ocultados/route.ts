import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * O que a sessão ocultou (F10). `hidden_questions` guarda o par (pessoa,
 * pergunta); o título vem de `recommendation_requests` sob a RLS. Pergunta que
 * a pessoa não pode mais ler sai da lista — não vira linha vazia.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const { data, error } = await client
      .from("hidden_questions")
      .select("request_id,hidden_at")
      .eq("user_id", userId)
      .order("hidden_at", { ascending: false })
    if (error) throw error
    const linhas = data ?? []
    const ids = linhas.map((linha) => linha.request_id)
    const titulos = new Map<string, string>()
    if (ids.length > 0) {
      const lidas = await client.from("recommendation_requests").select("id,title").in("id", ids)
      if (lidas.error) throw lidas.error
      for (const pergunta of lidas.data ?? []) titulos.set(pergunta.id, pergunta.title)
    }
    return responder(
      request,
      {
        ocultados: linhas.flatMap((linha) => {
          const titulo = titulos.get(linha.request_id)
          if (titulo === undefined) return []
          return [{ id: linha.request_id, titulo, ocultadoEm: linha.hidden_at }]
        }),
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
