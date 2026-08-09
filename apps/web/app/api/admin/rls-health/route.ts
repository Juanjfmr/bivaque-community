import { NextResponse } from "next/server"
import { log } from "../../../../lib/logger"
import { classifyRlsProbe, runRlsProbe } from "../../../../lib/rls-probe"
import { createServerClient } from "../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * RLS health probe, operator-only.
 *
 * Replaces the "RLS e privacidade" line of the runbook §9 daily health check.
 * Up to 2026-08-09 the guarantee was "paridade de migration" (`test:db` local
 * on CI). The probe adds a live check against production, executed as a
 * common user (never `service_role`): the same boundary a real member would
 * cross, walked by the operator on every business day.
 *
 * The response carries only the probe status, the seven booleans, and the
 * timestamp. No row contents, no CPF, no payload, no token. The logger
 * receives only the status and ids — never `checks` with detail.
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

  const result = await runRlsProbe()

  log.info("rls health probe", {
    status: result.status,
    checked_at: result.checked_at,
    operatorId: userId,
    // Deliberately omit `result.checks` here: the detail strings are safe
    // but log volume scales with run frequency. Operators get the full picture
    // in the response.
  })

  return NextResponse.json(result)
}

// Re-exporting the classifier keeps the typed route surface self-contained for
// tests that only need to assert on the shape without importing the lib.
export { classifyRlsProbe }
