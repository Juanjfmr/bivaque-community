import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LIMITE = 50

/**
 * Minhas publicações e minhas perguntas (F10), as duas mais recentes primeiro.
 *
 * Lista vazia é resposta legítima — quem nunca publicou tem zero, não erro. O
 * que NÃO é legítimo é falha de banco virar lista vazia: por isso a leitura
 * sobe e a rota responde 503.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const [posts, perguntas] = await Promise.all([
      client
        .from("posts")
        .select("id,content,group_id,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(LIMITE),
      client
        .from("recommendation_requests")
        .select("id,title,is_resolved,created_at")
        .eq("author_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(LIMITE),
    ])
    if (posts.error) throw posts.error
    if (perguntas.error) throw perguntas.error

    const linhas = posts.data ?? []
    const grupos = [
      ...new Set(linhas.flatMap((linha) => (linha.group_id === null ? [] : [linha.group_id]))),
    ]
    const nomes = new Map<string, string>()
    if (grupos.length > 0) {
      const lidos = await client.from("groups").select("id,name").in("id", grupos)
      if (lidos.error) throw lidos.error
      for (const grupo of lidos.data ?? []) nomes.set(grupo.id, grupo.name)
    }

    const ids = (perguntas.data ?? []).map((linha) => linha.id)
    const respostas = new Map<string, number>()
    if (ids.length > 0) {
      const lidas = await client
        .from("recommendation_replies")
        .select("request_id")
        .in("request_id", ids)
        .eq("is_deleted", false)
      if (lidas.error) throw lidas.error
      for (const linha of lidas.data ?? []) {
        respostas.set(linha.request_id, (respostas.get(linha.request_id) ?? 0) + 1)
      }
    }

    return responder(
      request,
      {
        publicacoes: linhas.map((linha) => ({
          id: linha.id,
          texto: linha.content,
          criadaEm: linha.created_at,
          grupo: linha.group_id === null ? null : (nomes.get(linha.group_id) ?? null),
        })),
        perguntas: (perguntas.data ?? []).map((linha) => ({
          id: linha.id,
          titulo: linha.title,
          criadaEm: linha.created_at,
          resolvida: linha.is_resolved,
          respostas: respostas.get(linha.id) ?? 0,
        })),
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
