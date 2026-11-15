import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { ehUuid } from "../../eventos/_comum"

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

/**
 * Bloqueia UMA pessoa (F09-A). O corpo só escolhe quem: quem bloqueia é
 * `blocker_user_id` da sessão, e a policy confere de novo. O banco é quem
 * autoriza — sem cliente privilegiado nesta rota — e id fora do formato é 404,
 * que não confirma a existência de ninguém.
 *
 * Duplicata é idempotente: já bloqueado devolve o mesmo estado, 200. Bloqueio
 * de si mesmo é 400 antes da escrita (o `CHECK` do banco recusaria de qualquer
 * forma, mas a rota não manda o banco decidir o que o corpo já denuncia).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return responder(request, { erro: "corpo-invalido" }, 400)
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, lido.status)
  const alvo = lido.corpo["id"]
  if (typeof alvo !== "string") return responder(request, { erro: "dados-invalidos" }, 400)
  if (!ehUuid(alvo)) return responder(request, { erro: "nao-encontrado" }, 404)
  const userId = auth.sessao.usuario.id
  if (alvo === userId) return responder(request, { erro: "dados-invalidos" }, 400)
  try {
    const { error } = await auth.sessao.cliente
      .from("dm_blocks")
      .insert({ blocker_user_id: userId, blocked_user_id: alvo })
    if (error) {
      // 23505: a linha já existia — o pedido alcançou o mesmo estado, então 200.
      if (error.code === "23505") return responder(request, { bloqueado: { id: alvo } }, 200)
      // 23503: ninguém com este id. Mesma resposta do formato inválido.
      if (error.code === "23503") return responder(request, { erro: "nao-encontrado" }, 404)
      if (error.code === "42501" || error.code === "23514")
        return responder(request, { erro: "recusado" }, 403)
      throw error
    }
    return responder(request, { bloqueado: { id: alvo } }, 201)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
