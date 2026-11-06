import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * O pedido de exclusão da conta (F10), pelo fluxo que já existe:
 * `request_account_deletion()` é `security definer`, usa `auth.uid()` e trata o
 * prazo. A rota não apaga nada por conta própria nem inventa prazo — devolve o
 * que a função gravou.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const userId = auth.sessao.usuario.id
  try {
    const { data, error } = await auth.sessao.cliente.rpc("request_account_deletion")
    if (error) throw error
    const corpo = (data ?? {}) as { requested_at?: unknown; due_at?: unknown }
    const texto = (valor: unknown): string | null => (typeof valor === "string" ? valor : null)
    return responder(
      request,
      {
        pedido: { solicitadoEm: texto(corpo.requested_at), prazoEm: texto(corpo.due_at) },
        pendente: true,
      },
      200,
    )
  } catch (erro) {
    log.error("app voce: exclusão falhou", {
      error: erro instanceof Error ? erro.message : "unknown",
      userId,
    })
    return responder(request, { erro: "exclusao-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
