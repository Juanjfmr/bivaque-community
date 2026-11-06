import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Pessoas bloqueadas pela sessão (F10). O nome vem de `profiles` sob a RLS da
 * sessão: quando a policy não devolve a linha, o nome é `null` e a tela diz
 * "Pessoa bloqueada" — nunca inventa um nome.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const { data, error } = await client
      .from("dm_blocks")
      .select("blocked_user_id,created_at")
      .eq("blocker_user_id", userId)
      .order("created_at", { ascending: false })
    if (error) throw error
    const linhas = data ?? []
    const ids = linhas.map((linha) => linha.blocked_user_id)
    const nomes = new Map<string, string>()
    if (ids.length > 0) {
      const lidos = await client.from("profiles").select("user_id,display_name").in("user_id", ids)
      if (lidos.error) throw lidos.error
      for (const perfil of lidos.data ?? []) nomes.set(perfil.user_id, perfil.display_name)
    }
    return responder(
      request,
      {
        bloqueados: linhas.map((linha) => ({
          id: linha.blocked_user_id,
          nome: nomes.get(linha.blocked_user_id) ?? null,
          bloqueadoEm: linha.created_at,
        })),
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
