import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import {
  alertaDaLinha,
  alertaParaCorpo,
  COLUNAS_DO_ALERTA,
  parseAlertCriteria,
} from "../../../../../../lib/listings/alerts"
import { ehUuid } from "../../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/**
 * Edita o alerta — os critérios e/ou a situação (`ativo`).
 *
 * O `id` só escolhe a linha: a policy `listing_alerts_update_owner` é quem
 * decide se ela é da sessão. Linha alheia e linha inexistente dão o mesmo 404,
 * que não confirma a existência do alerta de outra pessoa. `locality_id` não é
 * tocado: o app não oferece cidade, e apagar em silêncio um alerta antigo
 * limitado a uma cidade seria perder critério sem a pessoa ver.
 */
export async function PATCH(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "alerta-nao-encontrado" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return responder(request, { erro: "corpo-invalido" }, 400)
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, lido.status)
  const validado = parseAlertCriteria(lido.corpo)
  if (!validado.ok)
    return responder(request, { erro: "dados-invalidos", campo: validado.campo }, 400)

  const criterios = validado.criterios
  try {
    const { data, error } = await auth.sessao.cliente
      .from("listing_alerts")
      .update({
        name: criterios.name,
        neighborhood: criterios.neighborhood,
        deal: criterios.deal,
        max_value_cents: criterios.maxValueCents,
        min_bedrooms: criterios.minBedrooms,
        is_active: criterios.isActive,
      })
      .eq("id", id)
      .select(COLUNAS_DO_ALERTA)
    if (error) throw error
    const linha = (data ?? [])[0]
    if (linha === undefined) return responder(request, { erro: "alerta-nao-encontrado" }, 404)
    return responder(request, { alerta: alertaParaCorpo(alertaDaLinha(linha)) }, 200)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

/** Apaga o alerta. Mesma regra de posse do PATCH, e as entregas caem junto. */
export async function DELETE(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "alerta-nao-encontrado" }, 404)
  try {
    const { data, error } = await auth.sessao.cliente
      .from("listing_alerts")
      .delete()
      .eq("id", id)
      .select("id")
    if (error) throw error
    if ((data ?? []).length === 0) return responder(request, { erro: "alerta-nao-encontrado" }, 404)
    return responder(request, { removido: true }, 200)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
