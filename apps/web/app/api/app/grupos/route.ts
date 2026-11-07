import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../lib/app-api/rota-do-app"
import { contarMembrosAprovados } from "../../../../lib/search/contagem-de-membros"
import { cidadeDaSessao } from "../eventos/_comum"
import { apresentarGrupo, CAMPOS_DO_GRUPO, pagina, registrarFalha } from "./_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const depois = pagina(request)
  if (depois === null) return responder(request, { erro: "pagina-invalida" }, 400)
  try {
    const client = auth.sessao.cliente
    const userId = auth.sessao.usuario.id
    const cidade = await cidadeDaSessao(client, userId)
    if (!cidade) return responder(request, { grupos: [], cidade: "", proximo: null }, 200)
    const grupos = await client
      .from("groups")
      .select(CAMPOS_DO_GRUPO)
      .eq("locality_id", cidade.id)
      .eq("is_deleted", false)
      .order("name")
      .order("id")
      .range(depois, depois + 19)
    if (grupos.error) throw grupos.error
    const linhas = grupos.data ?? []
    const contagem = await contarMembrosAprovados(
      client,
      linhas.map((grupo) => grupo.id),
    )
    const minhas = await client
      .from("group_memberships")
      .select("group_id,status,role")
      .eq("user_id", userId)
      .in(
        "group_id",
        linhas.map((grupo) => grupo.id),
      )
    if (minhas.error) throw minhas.error
    return responder(
      request,
      {
        grupos: linhas.map((grupo) =>
          apresentarGrupo(
            grupo,
            (minhas.data ?? []).find((m) => m.group_id === grupo.id) ?? null,
            userId,
            contagem.get(grupo.id) ?? 0,
          ),
        ),
        cidade: cidade.nome,
        proximo: linhas.length === 20 ? String(depois + 20) : null,
      },
      200,
    )
  } catch (error) {
    registrarFalha("group directory", error)
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
