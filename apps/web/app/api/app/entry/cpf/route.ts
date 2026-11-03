import { CODE_OF_CONDUCT_VERSION, CONSENT_VERSION, isValidCpf } from "@bivaque/domain"
import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"
import { verifyEligibility } from "../../../../../lib/onboarding/verifyAndProvision"
import { withoutReason } from "../../../../../lib/portal/browser-outcome"
import { createServerClient } from "../../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Consulta do vínculo pelo CPF no app (LAN-F01). O CPF chega no corpo, é
// validado e consultado no Portal **no servidor**, e não é gravado nem devolvido:
// a resposta é o resultado sem motivo técnico (ADR-20260922-identidade-quando-
// portal-falha), e o log nunca carrega o CPF. A regra de elegibilidade é a mesma
// função que a web usa — um caminho só, duas portas.
//
// O aceite é exigido antes: o CPF é consultado no Portal assim que digitado, e a
// pessoa precisa ter visto a política que explica esse uso (ADR de entrada §3).

const CORPO_MAXIMO = 4 * 1024

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessao = await exigirSessao(request)
  if (!sessao.ok) return sessao.resposta

  const porta = conferirEscrita(request, sessao.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  const lido = await lerCorpoJson(request, CORPO_MAXIMO)
  if (!lido.ok) {
    return responder(request, { erro: "corpo-invalido" }, lido.status)
  }

  const cpf = lido.corpo["cpf"]
  if (typeof cpf !== "string" || !isValidCpf(cpf)) {
    return responder(request, { erro: "cpf-invalido" }, 400)
  }

  const cliente = createServerClient()
  const userId = sessao.sessao.usuario.id

  const { data: aceitou, error: consentError } = await cliente.rpc("has_accepted_consent", {
    p_user_id: userId,
    p_consent_version: CONSENT_VERSION,
    p_code_of_conduct_version: CODE_OF_CONDUCT_VERSION,
  })
  if (consentError) {
    log.error("cpf verification: consent read failed", { error: consentError.message, userId })
    return responder(request, { erro: "indisponivel" }, 503)
  }
  if (aceitou !== true) {
    return responder(request, { erro: "aceite-pendente" }, 403)
  }

  try {
    const resultado = await verifyEligibility(cliente, {
      userId,
      cpf,
      consentVersion: CONSENT_VERSION,
    })
    if (
      resultado.outcome.status === "temporary_error" &&
      resultado.outcome.errorCode === "INVALID_KEY"
    ) {
      log.error("Portal verification unavailable: API key not configured", {
        action: "app-verify-cpf",
      })
    }
    return responder(request, { outcome: withoutReason(resultado.outcome) }, 200)
  } catch (erro: unknown) {
    log.error("cpf verification failed", {
      error: erro instanceof Error ? erro.message : "unknown",
      userId,
    })
    return responder(request, { erro: "indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
