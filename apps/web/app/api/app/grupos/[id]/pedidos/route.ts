import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../../lib/app-api/rota-do-app"
import { ehUuid } from "../../../eventos/_comum"
import { nomesDeAutores } from "../../../perguntas/_comum"
import { grupoDaSessao, pagina, participacao } from "../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }
export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "grupo-nao-encontrado" }, 404)
  const depois = pagina(request)
  if (depois === null) return responder(request, { erro: "pagina-invalida" }, 400)
  try {
    const client = auth.sessao.cliente
    const userId = auth.sessao.usuario.id
    const grupo = await grupoDaSessao(client, id)
    if (!grupo) return responder(request, { erro: "grupo-nao-encontrado" }, 404)
    const membro = await participacao(client, id, userId)
    if (grupo.owner_user_id !== userId || membro?.status !== "approved") {
      return responder(request, { erro: "nao-admin" }, 403)
    }
    const pendentes = await client
      .from("group_memberships")
      .select("user_id")
      .eq("group_id", id)
      .eq("status", "pending")
      .order("joined_at")
      .order("user_id")
      .range(depois, depois + 19)
    if (pendentes.error) throw pendentes.error
    const linhas = pendentes.data ?? []
    const ids = linhas.map((p) => p.user_id)
    const motivos =
      ids.length === 0
        ? { data: [], error: null }
        : await client
            .from("group_join_reasons")
            .select("user_id,reason")
            .eq("group_id", id)
            .in("user_id", ids)
    if (motivos.error) throw motivos.error
    const nomes = await nomesDeAutores(client, ids)
    const notas = new Map((motivos.data ?? []).map((m) => [m.user_id, m.reason]))
    return responder(
      request,
      {
        pedidos: linhas.map((p) => ({
          id: p.user_id,
          nome: nomes.get(p.user_id) ?? "",
          motivo: notas.get(p.user_id) ?? "",
        })),
        proximo: linhas.length === 20 ? String(depois + 20) : null,
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
