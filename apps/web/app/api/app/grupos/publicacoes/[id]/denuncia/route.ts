import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../../lib/app-api/rota-do-app"
import { composeReason, validateReportInput } from "../../../../../../../lib/reports/reports"
import { ehUuid, interpretarErroDoBanco } from "../../../../eventos/_comum"
import { grupoDaSessao, participacao, publicacaoDaSessao, registrarFalha } from "../../../_comum"

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
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return responder(request, { erro: "corpo-invalido" }, 400)
  const lido = await lerCorpoJson(request)
  const motivo = lido.ok ? lido.corpo["motivo"] : null
  const explicacao = lido.ok ? (lido.corpo["explicacao"] ?? "") : null
  if (typeof motivo !== "string" || typeof explicacao !== "string")
    return responder(request, { erro: "dados-invalidos" }, 400)
  const validado = validateReportInput({ reason: motivo, explanation: explicacao })
  if (!validado.ok) return responder(request, { erro: validado.error }, 400)
  try {
    const client = auth.sessao.cliente
    const userId = auth.sessao.usuario.id
    const post = await publicacaoDaSessao(client, id)
    if (!post?.group_id) return responder(request, { erro: "publicacao-nao-encontrada" }, 404)
    const grupo = await grupoDaSessao(client, post.group_id)
    if (!grupo) return responder(request, { erro: "publicacao-nao-encontrada" }, 404)
    const membro = await participacao(client, grupo.id, userId)
    if (grupo.visibility === "private" && membro?.status !== "approved")
      return responder(request, { erro: "publicacao-nao-encontrada" }, 404)
    if (membro?.status !== "approved") return responder(request, { erro: "nao-membro" }, 403)
    if (post.user_id === userId) return responder(request, { erro: "proprio-conteudo" }, 403)
    const result = await client
      .from("reports")
      .insert({
        reporter_user_id: userId,
        target_type: "post",
        target_id: id,
        reason: composeReason(validado.label, validado.explanation),
      })
      .select("id")
      .single()
    if (result.error) {
      if (result.error.code === "23505")
        return responder(
          request,
          { erro: "ja-denunciado", mensagem: "Você já denunciou esta publicação." },
          409,
        )
      const falha = interpretarErroDoBanco(result.error.code, {
        recusado: "Sua conta não pode denunciar esta publicação.",
        dados: "Revise o motivo da denúncia.",
      })
      if (falha.status === 503) registrarFalha("report", result.error)
      return responder(request, falha.corpo, falha.status)
    }
    if (!result.data) throw new Error("insert without result")
    return responder(request, { denuncia: { id: result.data.id } }, 201)
  } catch (error) {
    registrarFalha("report", error)
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}
export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
