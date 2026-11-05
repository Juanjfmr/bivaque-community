import { CODE_OF_CONDUCT_VERSION, CONSENT_VERSION } from "@bivaque/domain"
import type { NextRequest, NextResponse } from "next/server"
import {
  clienteDeServicoOuNulo,
  conferirEscrita,
  exigirSessao,
  opcoesDoApp,
  responder,
  respostaIndisponivel,
} from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Aceite da entrada pelo app (LAN-F01, ADR-20261101-entrada-unica-por-codigo §3).
//
// O corpo é vazio de propósito: as versões aceitas são as do contrato
// compartilhado, nunca escolha de quem chama. O autor é o id da sessão, nunca
// parâmetro. O RPC `record_consent_acceptance` é a mesma gravação que a web usa.

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessao = await exigirSessao(request)
  if (!sessao.ok) return sessao.resposta

  const porta = conferirEscrita(request, sessao.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  const servico = clienteDeServicoOuNulo()
  if (servico === null) return respostaIndisponivel(request)
  const { error } = await servico.rpc("record_consent_acceptance", {
    p_user_id: sessao.sessao.usuario.id,
    p_consent_version: CONSENT_VERSION,
    p_code_of_conduct_version: CODE_OF_CONDUCT_VERSION,
  })

  if (error) {
    log.error("consent record failed", { error: error.message })
    return responder(request, { erro: "gravacao-indisponivel" }, 503)
  }

  return responder(
    request,
    {
      aceito: true,
      consent_version: CONSENT_VERSION,
      code_of_conduct_version: CODE_OF_CONDUCT_VERSION,
    },
    200,
  )
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
