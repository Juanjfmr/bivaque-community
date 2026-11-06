import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../../lib/app-api/rota-do-app"
import { clienteDosGrupos, lerComentarioDoGrupo } from "../../../../../../../lib/communities/grupos"
import { ehUuid, interpretarErroDoBanco } from "../../../../eventos/_comum"
import {
  CAMPOS_DO_COMENTARIO,
  type ComentarioBruto,
  grupoDaSessao,
  participacao,
  publicacaoDaSessao,
} from "../../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "publicacao-nao-encontrada" }, 404)
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }
  const lido = await lerCorpoJson(request)
  const dados = lido.ok ? lerComentarioDoGrupo(lido.corpo) : null
  if (!dados || (dados.reply_to_id !== null && !ehUuid(dados.reply_to_id))) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  try {
    const client = auth.sessao.cliente
    const userId = auth.sessao.usuario.id
    const post = await publicacaoDaSessao(client, id)
    if (!post?.group_id || !(await grupoDaSessao(client, post.group_id)))
      return responder(request, { erro: "publicacao-nao-encontrada" }, 404)
    const membro = await participacao(client, post.group_id, userId)
    if (membro?.status !== "approved") return responder(request, { erro: "nao-membro" }, 403)
    if (dados.reply_to_id !== null) {
      const alvo = await client
        .from("comments")
        .select("id")
        .eq("id", dados.reply_to_id)
        .eq("post_id", id)
        .eq("is_deleted", false)
        .maybeSingle()
      if (alvo.error) throw alvo.error
      if (!alvo.data) return responder(request, { erro: "comentario-nao-encontrado" }, 404)
    }
    const linha = { ...dados, post_id: id, user_id: userId }
    const result = await clienteDosGrupos(client)
      .from("comments")
      .insert(linha)
      .select(CAMPOS_DO_COMENTARIO)
      .single()
      .overrideTypes<ComentarioBruto, { merge: false }>()
    if (result.error) {
      const falha = interpretarErroDoBanco(result.error.code, {
        recusado: "Sua conta não pode comentar nesta publicação.",
        dados: "Revise o comentário e a resposta escolhida.",
      })
      return responder(request, falha.corpo, falha.status)
    }
    const c = result.data
    if (!c) throw new Error("insert without result")
    return responder(
      request,
      {
        comentario: {
          id: c.id,
          texto: c.content,
          criadaEm: c.created_at,
          autor: "",
          propria: true,
          parentId: c.parent_id,
          respondeA: c.reply_to_id,
          para: "",
          uteis: 0,
          util: false,
        },
      },
      201,
    )
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}
export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
