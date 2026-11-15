import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import {
  alertaDaLinha,
  alertaParaCorpo,
  COLUNAS_DO_ALERTA,
  parseAlertCriteria,
} from "../../../../../lib/listings/alerts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Alertas de busca de imóvel da sessão (RUN-169): a gestão que a tela
 * `/imoveis/alertas` da web servia antes do 307.
 *
 * A posse é do BANCO: o cliente é o da sessão, sob RLS, e as policies de dono
 * (`listing_alerts_select_owner` e `…_insert_owner`) decidem o que esta rota
 * alcança. Ela não repete a checagem em `where` para não existir uma segunda
 * regra de posse que possa divergir da primeira.
 */

/** Os alertas do próprio dono, do mais novo para o mais antigo. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  try {
    const { data, error } = await auth.sessao.cliente
      .from("listing_alerts")
      .select(COLUNAS_DO_ALERTA)
      .order("created_at", { ascending: false })
    if (error) throw error
    const alertas = (data ?? []).map((linha) => alertaParaCorpo(alertaDaLinha(linha)))
    return responder(request, { alertas }, 200)
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

/**
 * Cria um alerta. O corpo traz só os critérios: `owner_user_id` vem da sessão
 * (nunca do corpo) e `kind` é sempre `property` — este é o alerta de imóvel, e
 * é o que o dispatch da entrega casa. A validação é a de
 * `lib/listings/alerts.ts`, a mesma que a action antiga usava; repetir a mesma
 * busca cria outra linha, como antes (a tabela não deduplica).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
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
      .insert({
        owner_user_id: auth.sessao.usuario.id,
        name: criterios.name,
        kind: "property",
        // O app não oferece cidade (nenhuma fonte das cidades do membro na
        // porta de dados); nulo é "qualquer cidade que eu alcance", o mesmo que
        // a action gravava quando o campo não vinha.
        locality_id: null,
        neighborhood: criterios.neighborhood,
        deal: criterios.deal,
        max_value_cents: criterios.maxValueCents,
        min_bedrooms: criterios.minBedrooms,
        is_active: criterios.isActive,
      })
      .select(COLUNAS_DO_ALERTA)
      .single()
    if (error || data === null) throw error ?? new Error("insert sem linha")
    return responder(request, { alerta: alertaParaCorpo(alertaDaLinha(data)) }, 201)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
