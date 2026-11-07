import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import {
  lerPreferencias,
  salvarPreferencias,
  validarAtualizacao,
} from "../../../../../lib/notifications/preferencias-do-app"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Preferências de aviso da sessão (F09): leitura e gravação no mesmo formato
 * que a web antiga usa (quatro tipos × canal). O `user_id` vem da sessão; o
 * corpo só carrega escolha, nunca dono.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  try {
    const preferencias = await lerPreferencias(auth.sessao.cliente, auth.sessao.usuario.id)
    return responder(request, { preferencias }, 200)
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }

  const lido = await lerCorpoJson(request)
  const atualizacao = lido.ok ? validarAtualizacao(lido.corpo) : null
  if (atualizacao === null) return responder(request, { erro: "dados-invalidos" }, 400)

  const userId = auth.sessao.usuario.id
  try {
    await salvarPreferencias(auth.sessao.cliente, userId, atualizacao)
    // Devolve o que ficou GRAVADO, não o que foi enviado.
    const preferencias = await lerPreferencias(auth.sessao.cliente, userId)
    return responder(request, { preferencias }, 200)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
