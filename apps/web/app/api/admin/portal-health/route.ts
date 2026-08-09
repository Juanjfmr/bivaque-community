import { NextResponse } from "next/server"
import { log } from "../../../../lib/logger"
import { probePortal } from "../../../../lib/portal"
import { createServerClient } from "../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Probe de saúde do Portal da Transparência, exclusivo do operador.
 *
 * Substitui o check diário manual do runbook §9 ("testar uma requisição com
 * a chave de produção localmente") por um endpoint autorizado. A chave nunca
 * sai do servidor: nem na resposta, nem em log — o operador recebe apenas um
 * enum de status e o horário da checagem.
 *
 * É autorizado de propósito (não público): um oráculo externo sobre a
 * validade da chave serviria a quem quer testá-la sem autorização.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }

  const supabase = createServerClient()
  const token = authHeader.slice(7)

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser(token)

  if (authError || !authUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const userId = authUser.id

  const { data: isOperator, error: opError } = await supabase.rpc("is_current_user_operator", {
    p_user_id: userId,
  })

  if (opError) {
    log.error("operator check failed", { error: opError.message, userId })
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }

  if (!isOperator) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const apiKey = process.env["PORTAL_DADOS_API_KEY"] ?? ""
  const status = await probePortal(apiKey)
  const checkedAt = new Date().toISOString()

  // Loga apenas o status e o horário — nunca a chave nem o corpo do Portal.
  log.info("portal health probe", { status, checkedAt, operatorId: userId })

  return NextResponse.json({ status, checked_at: checkedAt })
}
