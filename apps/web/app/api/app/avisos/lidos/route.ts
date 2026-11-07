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
 * Marcar aviso como lido (F09): um (`{ id }`) ou todos (`{ todos: true }`).
 *
 * O destinatário é sempre o da sessão. Um id de outra pessoa não é recusado
 * com a existência dele na resposta: a atualização simplesmente não alcança
 * linha nenhuma, e o corpo diz `atualizados: 0`. Marcar o que já estava lido
 * também é 0 — a operação é idempotente, como o botão da tela espera.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }

  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, lido.status)

  const corpo = lido.corpo
  const todos = corpo["todos"] === true
  const id = corpo["id"]
  const avisoUnico = ehUuid(typeof id === "string" ? id : undefined)
  if (todos === avisoUnico) {
    // Nem "um" nem "todos": o corpo não diz o que marcar.
    return responder(request, { erro: "dados-invalidos" }, 400)
  }

  const userId = auth.sessao.usuario.id
  try {
    let atualizacao = auth.sessao.cliente
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_user_id", userId)
      .is("read_at", null)
    if (!todos) atualizacao = atualizacao.eq("id", id as string)

    const { data, error } = await atualizacao.select("id")
    if (error) throw error
    return responder(request, { atualizados: (data ?? []).length }, 200)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
