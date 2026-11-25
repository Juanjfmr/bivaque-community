import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import {
  atendimentoDoPrestador,
  salvarAtendimento,
} from "../../../../../lib/providers/prestador-area"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// TROCA-005 — a área de atendimento do prestador. O alcance liga e desliga a
// presença da ficha na busca; o efeito real é o do banco (`provider_reach` sob
// as policies owner-only), e a leitura é da própria conta de prestador.

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  try {
    const atendimento = await atendimentoDoPrestador(auth.sessao.cliente, auth.sessao.usuario.id)
    return responder(request, { atendimento }, 200)
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  const lido = await lerCorpoJson(request)
  const ativo = lido.ok ? lido.corpo["ativo"] : undefined
  if (typeof ativo !== "boolean") return responder(request, { erro: "dados-invalidos" }, 400)

  const client = auth.sessao.cliente
  try {
    const resultado = await salvarAtendimento(client, auth.sessao.usuario.id, ativo)
    if (!resultado.ok) {
      return responder(
        request,
        { erro: resultado.motivo, mensagem: resultado.mensagem },
        resultado.motivo === "sem-ficha" ? 404 : 403,
      )
    }
    const atendimento = await atendimentoDoPrestador(client, auth.sessao.usuario.id)
    return responder(request, { atendimento }, 200)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
