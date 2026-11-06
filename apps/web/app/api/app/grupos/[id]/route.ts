import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { ehUuid } from "../../eventos/_comum"
import {
  apresentarGrupo,
  apresentarPublicacoes,
  CAMPOS_DA_PUBLICACAO,
  grupoDaSessao,
  type LinhaDaPublicacao,
  pagina,
  participacao,
} from "../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "grupo-nao-encontrado" }, 404)
  const depois = pagina(request)
  const ordem = new URL(request.url).searchParams.get("ordem") ?? "recentes"
  if (depois === null || !["recentes", "discutidas", "salvas", "ocultadas"].includes(ordem)) {
    return responder(request, { erro: "pagina-invalida" }, 400)
  }
  try {
    const client = auth.sessao.cliente
    const userId = auth.sessao.usuario.id
    const grupo = await grupoDaSessao(client, id)
    if (!grupo) return responder(request, { erro: "grupo-nao-encontrado" }, 404)
    const membro = await participacao(client, id, userId)
    const resumo = apresentarGrupo(grupo, membro, userId)
    if (resumo.fechado && !resumo.membro) {
      return responder(request, { grupo: resumo, publicacoes: [], proximo: null }, 200)
    }
    const feed = await client
      .rpc("feed_group", {
        p_group_id: id,
        p_order:
          {
            recentes: "recent",
            discutidas: "discussed",
            salvas: "saved",
            ocultadas: "hidden",
          }[ordem] ?? "recent",
      })
      .range(depois, depois + 19)
    if (feed.error) throw feed.error
    const ids = (feed.data ?? []).map((linha) => linha.id)
    const lidas =
      ids.length === 0
        ? { data: [], error: null }
        : await client
            .from("posts")
            .select(CAMPOS_DA_PUBLICACAO)
            .in("id", ids)
            .eq("group_id", id)
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
      {
        grupo: resumo,
        publicacoes: await apresentarPublicacoes(client, linhas, userId),
        proximo: ids.length === 20 ? String(depois + 20) : null,
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
