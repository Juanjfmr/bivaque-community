import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../../lib/app-api/rota-do-app"
import { ehUuid } from "../../../eventos/_comum"
import { nomesDeAutores } from "../../../perguntas/_comum"
import { grupoDaSessao, participacao, registrarFalha } from "../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }
export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "dados-invalidos" }, 400)
  try {
    const client = auth.sessao.cliente
    const grupo = await grupoDaSessao(client, id)
    if (!grupo) return responder(request, { erro: "grupo-nao-encontrado" }, 404)
    const membro = await participacao(client, id, auth.sessao.usuario.id)
    if (membro?.status !== "approved" || (membro.role !== "owner" && membro.role !== "moderator"))
      return responder(request, { erro: "nao-admin" }, 403)
    const { data, error } = await client
      .from("group_memberships")
      .select("user_id,role")
      .eq("group_id", id)
      .eq("status", "approved")
    if (error) throw error
    const linhas = data ?? []
    const nomes = await nomesDeAutores(
      client,
      linhas.map((linha) => linha.user_id),
    )
    return responder(
      request,
      {
        membros: linhas.map((linha) => ({
          id: linha.user_id,
          nome: nomes.get(linha.user_id) ?? "",
          papel: linha.role,
        })),
      },
      200,
    )
  } catch (error) {
    registrarFalha("membros", error)
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}
export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
