import { NextResponse } from "next/server"
import { log } from "../../../../../lib/logger"
import { createServerClient } from "../../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface HideActionRequest {
  action: "hide"
  note?: string
}

interface ResolveActionRequest {
  action: "resolve"
  note?: string
}

type ActionRequest = HideActionRequest | ResolveActionRequest

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: reportId } = await params

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
    log.error("operator check failed", { error: opError.message, userId, reportId })
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }

  if (!isOperator) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let body: ActionRequest
  try {
    body = (await request.json()) as ActionRequest
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const action = body.action
  if (action !== "hide" && action !== "resolve") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 })
  }

  const note = body.note ?? null

  try {
    // H-Task 3: ocultar, registrar e avisar sao um ato so. Esta rota e a Server
    // Action de (admin)/reports/page.tsx faziam a mesma coisa de dois jeitos —
    // e o jeito da pagina, que e o que o operador usa, nunca notificava o
    // denunciante. Os dois chamam public.resolve_report agora.
    //
    // O nome externo da acao continua "resolve" para nao quebrar quem ja chama
    // esta rota; no banco ele e 'dismiss'.
    const { error: rpcError } = await supabase.rpc("resolve_report", {
      p_report_id: reportId,
      p_operator_user_id: userId,
      p_action: action === "hide" ? "hide" : "dismiss",
      // exactOptionalPropertyTypes: sem nota, a chave nao vai.
      ...(note === null ? {} : { p_note: note }),
    })

    if (rpcError) {
      if (rpcError.code === "P0002") {
        return NextResponse.json({ error: "not found or already resolved" }, { status: 404 })
      }
      if (rpcError.code === "42501") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 })
      }
      log.error("resolve_report failed", { error: rpcError.message, userId, reportId, action })
      return NextResponse.json({ error: "internal" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, action, reportId })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "internal server error"
    log.error("admin reports action failed", {
      error: message,
      userId,
      reportId,
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
