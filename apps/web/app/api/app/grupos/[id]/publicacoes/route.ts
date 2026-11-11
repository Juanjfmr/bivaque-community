import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { clienteDosGrupos } from "../../../../../../lib/communities/grupos"
import { lerPublicacaoDoGrupo } from "../../../../../../lib/composer/post-attachment"
import { ehUuid, interpretarErroDoBanco } from "../../../eventos/_comum"
import { grupoDaSessao, participacao, registrarFalha } from "../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "grupo-nao-encontrado" }, 404)
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }
  const lido = await lerCorpoJson(request)
  const userId = auth.sessao.usuario.id
  const dados = lido.ok ? lerPublicacaoDoGrupo(lido.corpo, userId) : null
  if (!dados) return responder(request, { erro: "dados-invalidos" }, 400)
  try {
    const client = auth.sessao.cliente
    const grupo = await grupoDaSessao(client, id)
    if (!grupo) return responder(request, { erro: "grupo-nao-encontrado" }, 404)
    const membro = await participacao(client, id, userId)
    if (membro?.status !== "approved") return responder(request, { erro: "nao-membro" }, 403)
    const linha = {
      ...dados,
      group_id: id,
      locality_id: grupo.locality_id,
      community_id: null,
      user_id: userId,
    }
    const criado = await clienteDosGrupos(client)
      .from("posts")
      .insert(linha)
      .select(CAMPOS_DA_PUBLICACAO)
      .single()
    if (criado.error) {
      const falha = interpretarErroDoBanco(criado.error.code, {
        recusado: "Sua conta não pode publicar neste grupo.",
        dados: "Revise o texto e as fotos da publicação.",
      })
      if (falha.status === 503) registrarFalha("publish", criado.error)
      return responder(request, falha.corpo, falha.status)
    }
    if (!criado.data) throw new Error("insert without result")
    // A publicação volta montada como a lista a mostra (autor, hora, próprias),
    // para a tela receber o cartão pronto e o cursor que a segunda página abre.
    const [publicacao] = await apresentarPublicacoes(client, [criado.data], userId)
    if (!publicacao) throw new Error("insert without presentation")
    return responder(request, { publicacao, proximo: publicacao.id }, 201)
  } catch (error) {
    registrarFalha("publish", error)
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}
export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
