import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../../lib/app-api/rota-do-app"
import { ehUuid } from "../../../eventos/_comum"
import { nomesDeAutores } from "../../../perguntas/_comum"
import {
  apresentarGrupo,
  apresentarPublicacoes,
  CAMPOS_DO_COMENTARIO,
  type ComentarioBruto,
  grupoDaSessao,
  pagina,
  participacao,
  publicacaoDaSessao,
} from "../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "publicacao-nao-encontrada" }, 404)
  const depois = pagina(request)
  if (depois === null) return responder(request, { erro: "pagina-invalida" }, 400)
  try {
    const client = auth.sessao.cliente
    const userId = auth.sessao.usuario.id
    const post = await publicacaoDaSessao(client, id)
    if (!post?.group_id) return responder(request, { erro: "publicacao-nao-encontrada" }, 404)
    const grupo = await grupoDaSessao(client, post.group_id)
    if (!grupo) return responder(request, { erro: "publicacao-nao-encontrada" }, 404)
    const membro = await participacao(client, grupo.id, userId)
    if (grupo.visibility === "private" && membro?.status !== "approved") {
      return responder(request, { erro: "publicacao-nao-encontrada" }, 404)
    }
    const conversa = await client
      .from("comments")
      .select(CAMPOS_DO_COMENTARIO)
      .eq("post_id", id)
      .eq("is_deleted", false)
      .order("created_at")
      .order("id")
      .range(depois, depois + 49)
      .overrideTypes<ComentarioBruto[], { merge: false }>()
    if (conversa.error) throw conversa.error
    const linhas = conversa.data ?? []
    const nomes = await nomesDeAutores(
      client,
      linhas.map((c) => c.user_id),
    )
    const porId = new Map(linhas.map((c) => [c.id, c]))
    const publicacoes = await apresentarPublicacoes(client, [post], userId)
    return responder(
      request,
      {
        publicacao: publicacoes[0],
        grupo: apresentarGrupo(grupo, membro, userId),
        comentarios: linhas.map((c) => ({
          id: c.id,
          texto: c.content,
          criadaEm: c.created_at,
          autor: nomes.get(c.user_id) ?? "",
          propria: c.user_id === userId,
          parentId: c.parent_id,
          respondeA: c.reply_to_id,
          para: nomes.get(porId.get(c.reply_to_id ?? "")?.user_id ?? "") ?? "",
        })),
        proximo: linhas.length === 50 ? String(depois + 50) : null,
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
