import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { applyReportDecision } from "../../../../../lib/reports/operator-decision"
import { createServerClient } from "../../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  if (conferirEscrita(request, auth.sessao.via) !== "ok") {
    return responder(request, { error: "forbidden" }, 403)
  }
  const client = createServerClient()
  const operatorId = auth.sessao.usuario.id
  const { data: operator, error } = await client.rpc("is_current_user_operator", {
    p_user_id: operatorId,
  })
  if (error) return responder(request, { error: "unavailable" }, 503)
  if (operator !== true) return responder(request, { error: "forbidden" }, 403)

  const body = await lerCorpoJson(request)
  if (!body.ok) return responder(request, { error: "invalid json" }, body.status)
  const { id } = await params
  // "resolve" e nota opcional preservam os clientes da API antiga.
  const action = body.corpo["action"] === "resolve" ? "dismiss" : body.corpo["action"]
  const result = await applyReportDecision(client, operatorId, id, action, body.corpo["note"])
  const status = result.ok
    ? 200
    : result.error === "forbidden"
      ? 403
      : result.error === "already-resolved"
        ? 404
        : result.error === "resolve-failed"
          ? 503
          : 400
  return responder(
    request,
    result.ok ? { ok: true, action: body.corpo["action"], reportId: id } : { error: result.error },
    status,
  )
}

export function OPTIONS(request: Request) {
  return opcoesDoApp(request)
}
