import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../lib/app-api/rota-do-app"
import { log } from "../../../../lib/logger"
import { validarDestino, validarInscricao } from "../../../../lib/push/inscricao"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * A inscrição de push deste aparelho (RUN-137, ADR-20261107).
 *
 * - `GET` diz se o servidor tem as chaves VAPID — e devolve só a chave pública,
 *   nunca a privada. Sem configuração, o app não oferece o push.
 * - `POST` grava a inscrição do aparelho da sessão. O `user_id` vem da sessão;
 *   o corpo só carrega destino e chaves públicas. Reinscrever o mesmo destino
 *   troca o dono pela trigger do banco, sem UPDATE de cliente.
 * - `DELETE` apaga a inscrição deste aparelho (a saída do app e o pedido da
 *   pessoa usam este caminho).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta

  const chavePublica = process.env["WEB_PUSH_PUBLIC_KEY"]
  const chavePrivada = process.env["WEB_PUSH_PRIVATE_KEY"]
  const configurado = Boolean(chavePublica && chavePrivada)

  return responder(request, { configurado, chavePublica: configurado ? chavePublica : null }, 200)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }

  const lido = await lerCorpoJson(request)
  const inscricao = lido.ok ? validarInscricao(lido.corpo) : null
  if (inscricao === null) return responder(request, { erro: "dados-invalidos" }, 400)

  const userId = auth.sessao.usuario.id
  try {
    const { error } = await auth.sessao.cliente.from("push_subscriptions").insert({
      user_id: userId,
      kind: inscricao.kind,
      destination: inscricao.destination,
      key_p256dh: inscricao.keyP256dh,
      key_auth: inscricao.keyAuth,
      label: inscricao.label,
    })

    if (error) {
      if (error.code === "23505") return responder(request, { erro: "conflito" }, 409)
      throw error
    }

    return responder(request, { inscrito: true }, 201)
  } catch (error) {
    log.error("app push: subscribe failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  const lido = await lerCorpoJson(request)
  const destino = lido.ok ? validarDestino(lido.corpo) : null
  if (destino === null) return responder(request, { erro: "dados-invalidos" }, 400)

  const userId = auth.sessao.usuario.id
  try {
    const { data, error } = await auth.sessao.cliente
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("destination", destino)
      .select("id")

    if (error) throw error
    return responder(request, { removidos: data?.length ?? 0 }, 200)
  } catch (error) {
    log.error("app push: unsubscribe failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
