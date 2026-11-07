import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"
import { apresentarPublicacoes, CAMPOS_DA_PUBLICACAO, type LinhaDaPublicacao } from "../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LIMITE_DE_SALVOS = 50

/**
 * As publicações de grupo que a pessoa salvou (F04), para a tela Salvos — o
 * destino do "Salvar publicação" do feed.
 *
 * A leitura parte de `post_saves` com a sessão: a RLS já devolve só as linhas do
 * próprio `user_id`, na ordem em que foram salvas. Depois a RLS de `posts`
 * decide o que ainda pode ser lido (grupo de que a pessoa saiu, publicação
 * removida): o que não volta é simplesmente deixado de fora, não vira erro.
 * Falha de leitura é 503, não lista vazia.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const salvas = await client
      .from("post_saves")
      .select("post_id")
      .order("saved_at", { ascending: false })
      .limit(LIMITE_DE_SALVOS)
    if (salvas.error) throw salvas.error
    const ids = (salvas.data ?? []).map((linha) => linha.post_id)
    if (ids.length === 0) return responder(request, { publicacoes: [] }, 200)
    const lidas = await client
      .from("posts")
      .select(CAMPOS_DA_PUBLICACAO)
      .in("id", ids)
      .eq("is_deleted", false)
      .overrideTypes<LinhaDaPublicacao[], { merge: false }>()
    if (lidas.error) throw lidas.error
    const porId = new Map((lidas.data ?? []).map((linha) => [linha.id, linha]))
    const linhas = ids.flatMap((chave) => {
      const linha = porId.get(chave)
      return linha ? [linha] : []
    })
    return responder(
      request,
      { publicacoes: await apresentarPublicacoes(client, linhas, userId) },
      200,
    )
  } catch (error) {
    log.error("app grupos: saved publications failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
