import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { enviarFotoDoGrupo, lerFotoDoGrupo } from "../../../../../../lib/storage/foto-do-grupo"
import { ehUuid } from "../../../eventos/_comum"
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
  const lido = await lerCorpoJson(request, 7 * 1024 * 1024)
  const file = lido.ok ? lerFotoDoGrupo(lido.corpo) : null
  if (!file) return responder(request, { erro: "foto-invalida" }, 400)
  try {
    const client = auth.sessao.cliente
    const userId = auth.sessao.usuario.id
    if (!(await grupoDaSessao(client, id)))
      return responder(request, { erro: "grupo-nao-encontrado" }, 404)
    const membro = await participacao(client, id, userId)
    if (membro?.status !== "approved") return responder(request, { erro: "nao-membro" }, 403)
    const resultado = await enviarFotoDoGrupo(client, userId, id, file)
    if ("invalida" in resultado) return responder(request, { erro: "foto-invalida" }, 400)
    return responder(request, { caminho: resultado.caminho }, 201)
  } catch (error) {
    registrarFalha("photo upload", error)
    return responder(request, { erro: "foto-indisponivel" }, 503)
  }
}
export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
