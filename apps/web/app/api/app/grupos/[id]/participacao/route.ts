import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { entrarNoGrupo, lerMotivo } from "../../../../../../lib/communities/grupos"
import { contarMembrosAprovados } from "../../../../../../lib/search/contagem-de-membros"
import { cidadeDaSessao, ehUuid, interpretarErroDoBanco } from "../../../eventos/_comum"
import { apresentarGrupo, grupoDaSessao, participacao, registrarFalha } from "../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

async function mudar(
  request: NextRequest,
  { params }: Context,
  entrar: boolean,
): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "grupo-nao-encontrado" }, 404)
  let motivo = ""
  if (entrar) {
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return responder(request, { erro: "corpo-invalido" }, 400)
    }
    const lido = await lerCorpoJson(request)
    const texto = lido.ok ? lerMotivo(lido.corpo["motivo"]) : null
    if (texto === null) return responder(request, { erro: "motivo-invalido" }, 400)
    motivo = texto
  }
  try {
    const client = auth.sessao.cliente
    const userId = auth.sessao.usuario.id
    const grupo = await grupoDaSessao(client, id)
    if (!grupo) return responder(request, { erro: "grupo-nao-encontrado" }, 404)
    if (entrar) {
      const cidade = await cidadeDaSessao(client, userId)
      if (!cidade || cidade.id !== grupo.locality_id) {
        return responder(request, { erro: "de-outra-cidade" }, 403)
      }
    } else if (grupo.owner_user_id === userId) {
      return responder(
        request,
        {
          erro: "admin-nao-pode-sair",
          mensagem: "Transfira a administração antes de sair do grupo.",
        },
        409,
      )
    }
    const result = entrar
      ? await entrarNoGrupo(client, id, motivo)
      : await client.from("group_memberships").delete().eq("group_id", id).eq("user_id", userId)
    if (result.error) {
      if (result.error.code === "54000") {
        return responder(
          request,
          {
            erro: "limite-de-pedidos",
            mensagem:
              "Você já pediu entrada três vezes nos últimos 30 dias. Tente de novo mais tarde.",
          },
          429,
        )
      }
      const falha = interpretarErroDoBanco(result.error.code, {
        recusado: "Não foi possível mudar sua participação neste grupo.",
        dados: "Revise o motivo do pedido.",
      })
      if (falha.status === 503) registrarFalha("membership change", result.error)
      return responder(request, falha.corpo, falha.status)
    }
    const atualizado = await grupoDaSessao(client, id)
    if (!atualizado) return responder(request, { erro: "grupo-nao-encontrado" }, 404)
    const membro = await participacao(client, id, userId)
    const membros = (await contarMembrosAprovados(client, [id])).get(id) ?? 0
    return responder(request, { grupo: apresentarGrupo(atualizado, membro, userId, membros) }, 200)
  } catch (error) {
    registrarFalha("membership change", error)
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}
export function PUT(request: NextRequest, context: Context): Promise<NextResponse> {
  return mudar(request, context, true)
}
export function DELETE(request: NextRequest, context: Context): Promise<NextResponse> {
  return mudar(request, context, false)
}
export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
