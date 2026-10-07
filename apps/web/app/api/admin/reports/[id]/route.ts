import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
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

/**
 * Cliente autenticado COM O JWT DO CALLER (anon key + Bearer), nunca
 * service_role e nunca o de cookies.
 *
 * É o requisito do ADR-20261006 para o alvo `listing`: `public.moderate_listing`
 * deriva o ATOR de `auth.uid()` e confere o papel de operador dentro da
 * transação. Uma chamada por service_role zeraria `auth.uid()` e o RPC não
 * executa; um id de operador repassado por argumento seria o ator escolhido pelo
 * chamador. Esta rota é um Route Handler com header `Authorization`, então o
 * token é o do próprio operador e não existe cookie de sessão aqui.
 */
function createCallerClient(accessToken: string) {
  const url = process.env["SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }
  return createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

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
    //
    // O ALVO é resolvido aqui, no servidor, a partir da denúncia autorizada:
    // quem chama manda o id do relatório, nunca o id do anúncio. Um `post`
    // reportado continua indo para o `resolve_report` de service_role, e
    // `moderate_listing` recusaria de qualquer forma — a consulta abaixo é o que
    // escolhe o ramo sem confiar em dado do chamador.
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("id, target_type, target_id, status")
      .eq("id", reportId)
      .maybeSingle()

    if (reportError) {
      log.error("report lookup failed", { error: reportError.message, userId, reportId })
      return NextResponse.json({ error: "internal" }, { status: 500 })
    }
    if (!report) {
      return NextResponse.json({ error: "not found or already resolved" }, { status: 404 })
    }

    if (action === "hide" && report.target_type === "listing") {
      // Ramo anúncio: RPC autenticado do caller. `dismiss` NÃO entra aqui —
      // resolve_report resolve a denúncia sem tocar na marca, e é o mecanismo
      // que já notificava o denunciante.
      const caller = createCallerClient(token)
      const { error: moderateError } = await caller.rpc("moderate_listing", {
        p_listing_id: report.target_id,
        p_action: "hide",
        ...(note === null ? {} : { p_note: note }),
        p_report_id: reportId,
      })
      if (moderateError) {
        // A negativa do RPC é a mesma para alvo inválido, denúncia já resolvida
        // e papel insuficiente: 404 para o caso de estado e 403 para o de
        // permissão, sem revelar qual dos dois foi.
        if (moderateError.code === "P0002") {
          return NextResponse.json({ error: "not found or already resolved" }, { status: 404 })
        }
        if (moderateError.code === "42501") {
          return NextResponse.json({ error: "forbidden" }, { status: 403 })
        }
        log.error("moderate_listing failed", {
          error: moderateError.message,
          userId,
          reportId,
          action,
        })
        return NextResponse.json({ error: "internal" }, { status: 500 })
      }
      return NextResponse.json({ ok: true, action, reportId })
    }

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
