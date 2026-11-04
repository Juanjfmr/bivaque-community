import { CODE_OF_CONDUCT_VERSION, CONSENT_VERSION } from "@bivaque/domain"
import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"
import { validateProvisionInput } from "../../../../../lib/onboarding/provision-validation"
import { provisionMember } from "../../../../../lib/onboarding/verifyAndProvision"
import { createServerClient } from "../../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Provisionamento da entrada pelo app (LAN-F01): nome, cidade e momento viram
// vínculo, perfil e momento na MESMA transação, pela rota única que a web também
// usa (`provision_member_entry`). Só quem está VERIFICADO provisiona — a
// situação vem do banco, nunca do corpo. A validação é a mesma função da web
// (`validateProvisionInput`): cidade é código IBGE do catálogo, nunca texto
// livre; o momento e as datas seguem o CHECK da tabela.
//
// Ao concluir, o rascunho da entrada é apagado: o banco canônico passa a ser a
// fonte, como manda o ADR-20261102.

const CORPO_MAXIMO = 8 * 1024

export async function POST(request: NextRequest): Promise<NextResponse> {
  const sessao = await exigirSessao(request)
  if (!sessao.ok) return sessao.resposta

  const porta = conferirEscrita(request, sessao.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  const lido = await lerCorpoJson(request, CORPO_MAXIMO)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, lido.status)

  const corpo = lido.corpo
  const cliente = createServerClient()
  const userId = sessao.sessao.usuario.id

  const validacao = validateProvisionInput({
    ibgeCode: typeof corpo["ibge_code"] === "string" ? corpo["ibge_code"] : "",
    displayName: typeof corpo["display_name"] === "string" ? corpo["display_name"] : "",
    moment: typeof corpo["moment"] === "string" ? corpo["moment"] : "",
    arrivalDate: typeof corpo["arrival_date"] === "string" ? corpo["arrival_date"] : "",
    departureDate: typeof corpo["departure_date"] === "string" ? corpo["departure_date"] : "",
    destinationIbgeCode:
      typeof corpo["destination_ibge_code"] === "string" ? corpo["destination_ibge_code"] : "",
  })
  if (!validacao.ok) return responder(request, { erro: validacao.error }, 400)

  const { data: aceitou, error: consentError } = await cliente.rpc("has_accepted_consent", {
    p_user_id: userId,
    p_consent_version: CONSENT_VERSION,
    p_code_of_conduct_version: CODE_OF_CONDUCT_VERSION,
  })
  if (consentError) {
    log.error("provision: consent read failed", { error: consentError.message, userId })
    return responder(request, { erro: "indisponivel" }, 503)
  }
  if (aceitou !== true) return responder(request, { erro: "aceite-pendente" }, 403)

  const { data: statusRows, error: statusError } = await cliente.rpc("read_verification_status", {
    p_user_id: userId,
  })
  if (statusError) {
    log.error("provision: verification read failed", { error: statusError.message, userId })
    return responder(request, { erro: "indisponivel" }, 503)
  }
  const status = (statusRows as { status: string }[] | null)?.[0]?.status ?? null
  if (status !== "verified") return responder(request, { erro: "verificacao-pendente" }, 403)

  const { data: cidade, error: cidadeError } = await cliente
    .from("localities")
    .select("id")
    .eq("ibge_code", validacao.ibgeCode as string)
    .maybeSingle()
  if (cidadeError) {
    log.error("provision: locality lookup failed", { error: cidadeError.message, userId })
    return responder(request, { erro: "indisponivel" }, 503)
  }
  if (cidade === null) return responder(request, { erro: "cidade-desconhecida" }, 400)

  let destinoId: string | null = null
  if (validacao.moment === "leaving") {
    const { data: destino, error: destinoError } = await cliente
      .from("localities")
      .select("id")
      .eq("ibge_code", validacao.destinationIbgeCode as string)
      .maybeSingle()
    if (destinoError) {
      log.error("provision: destination lookup failed", { error: destinoError.message, userId })
      return responder(request, { erro: "indisponivel" }, 503)
    }
    if (destino === null) return responder(request, { erro: "destino-desconhecido" }, 400)
    destinoId = destino.id
  }

  try {
    const resultado = await provisionMember(cliente, {
      userId,
      localityId: cidade.id,
      displayName: validacao.displayName as string,
      consentVersion: CONSENT_VERSION,
      entryMoment:
        validacao.moment === undefined
          ? undefined
          : {
              moment: validacao.moment,
              arrivalDate: validacao.arrivalDate ?? null,
              departureDate: validacao.departureDate ?? null,
              destinationLocalityId: destinoId,
            },
    })

    // O rascunho cumpriu o papel: apagar é o ciclo de vida do ADR. Falha aqui
    // não desfaz a entrada; a purga da conta também conhece a linha.
    const { error: limpezaError } = await cliente
      .from("entry_progress")
      .delete()
      .eq("user_id", userId)
    if (limpezaError) {
      log.error("provision: entry progress cleanup failed", {
        error: limpezaError.message,
        userId,
      })
    }

    return responder(request, resultado, 200)
  } catch (erro: unknown) {
    log.error("provision failed", {
      error: erro instanceof Error ? erro.message : "unknown",
      userId,
    })
    return responder(request, { erro: "provisionamento-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
