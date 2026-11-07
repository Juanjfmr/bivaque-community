import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../../lib/app-api/rota-do-app"
import { clienteDosGrupos } from "../../../../../../../lib/communities/grupos"
import { ehUuid, interpretarErroDoBanco } from "../../../../eventos/_comum"
import {
  apresentarPublicacoes,
  grupoDaSessao,
  participacao,
  publicacaoDaSessao,
  registrarFalha,
} from "../../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }
const ACOES = ["util", "salvar", "fixar", "ocultar"]

export async function PUT(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "publicacao-nao-encontrada" }, 404)
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return responder(request, { erro: "corpo-invalido" }, 400)
  const lido = await lerCorpoJson(request)
  const acao = lido.ok ? lido.corpo["acao"] : null
  const valor = lido.ok ? lido.corpo["valor"] : null
  const comentarioId = lido.ok ? lido.corpo["comentarioId"] : undefined
  if (
    typeof acao !== "string" ||
    !ACOES.includes(acao) ||
    typeof valor !== "boolean" ||
    (comentarioId !== undefined &&
      (acao !== "util" || typeof comentarioId !== "string" || !ehUuid(comentarioId)))
  ) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  try {
    const client = auth.sessao.cliente
    const userId = auth.sessao.usuario.id
    const post = await publicacaoDaSessao(client, id)
    if (!post?.group_id) return responder(request, { erro: "publicacao-nao-encontrada" }, 404)
    const grupo = await grupoDaSessao(client, post.group_id)
    if (!grupo) return responder(request, { erro: "publicacao-nao-encontrada" }, 404)
    const membro = await participacao(client, grupo.id, userId)
    if (membro?.status !== "approved") return responder(request, { erro: "nao-membro" }, 403)
    if (acao === "fixar" && grupo.owner_user_id !== userId)
      return responder(request, { erro: "nao-admin" }, 403)
    const banco = clienteDosGrupos(client)
    let result: { error: { code?: string } | null }
    if (typeof comentarioId === "string") {
      const alvo = await client
        .from("comments")
        .select("id")
        .eq("id", comentarioId)
        .eq("post_id", id)
        .eq("is_deleted", false)
        .maybeSingle()
      if (alvo.error) throw alvo.error
      if (!alvo.data) return responder(request, { erro: "comentario-nao-encontrado" }, 404)
      result = valor
        ? await banco
            .from("comment_reactions")
            .upsert(
              { user_id: userId, comment_id: comentarioId },
              { onConflict: "user_id,comment_id", ignoreDuplicates: true },
            )
        : await banco
            .from("comment_reactions")
            .delete()
            .eq("user_id", userId)
            .eq("comment_id", comentarioId)
    } else if (acao === "fixar") {
      result = valor
        ? await client.rpc("pin_group_post", { p_group_id: grupo.id, p_post_id: id })
        : await client
            .from("groups")
            .update({ pinned_post_id: null })
            .eq("id", grupo.id)
            .eq("pinned_post_id", id)
    } else if (acao === "ocultar") {
      result = valor
        ? await banco
            .from("hidden_posts")
            .upsert(
              { user_id: userId, post_id: id },
              { onConflict: "user_id,post_id", ignoreDuplicates: true },
            )
        : await banco.from("hidden_posts").delete().eq("user_id", userId).eq("post_id", id)
    } else {
      const tabela = acao === "util" ? "post_reactions" : "post_saves"
      result = valor
        ? await client
            .from(tabela)
            .upsert(
              { user_id: userId, post_id: id },
              { onConflict: "post_id,user_id", ignoreDuplicates: true },
            )
        : await client.from(tabela).delete().eq("user_id", userId).eq("post_id", id)
    }
    if (result.error) {
      const falha = interpretarErroDoBanco(result.error.code, {
        recusado: "Sua conta não pode realizar esta ação.",
        dados: "Revise a ação escolhida.",
      })
      if (falha.status === 503) registrarFalha("post action", result.error)
      return responder(request, falha.corpo, falha.status)
    }
    if (typeof comentarioId === "string") {
      const contagem = await banco
        .from("comment_reactions")
        .select("comment_id", { count: "exact", head: true })
        .eq("comment_id", comentarioId)
      const minha = await banco
        .from("comment_reactions")
        .select("comment_id")
        .eq("comment_id", comentarioId)
        .eq("user_id", userId)
        .maybeSingle()
      if (contagem.error || minha.error) throw contagem.error ?? minha.error
      return responder(
        request,
        { comentario: { id: comentarioId, uteis: contagem.count ?? 0, util: minha.data !== null } },
        200,
      )
    }
    const salvo = await publicacaoDaSessao(client, id)
    const atualizado = await grupoDaSessao(client, grupo.id)
    if (!salvo || !atualizado) return responder(request, { erro: "publicacao-nao-encontrada" }, 404)
    return responder(
      request,
      {
        publicacao: (await apresentarPublicacoes(client, [salvo], userId))[0],
        fixada: atualizado.pinned_post_id,
      },
      200,
    )
  } catch (error) {
    registrarFalha("post action", error)
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}
export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
