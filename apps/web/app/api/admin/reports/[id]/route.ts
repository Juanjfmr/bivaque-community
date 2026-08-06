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
  const resolvedAt = new Date().toISOString()

  try {
    if (action === "resolve") {
      const { data: report, error: resolveError } = await supabase
        .from("reports")
        .update({
          status: "resolved",
          operator_note: note,
          resolved_by: userId,
          resolved_at: resolvedAt,
        })
        .eq("id", reportId)
        .eq("status", "open")
        .select()
        .single()

      if (resolveError) {
        log.error("resolve failed", {
          error: resolveError.message,
          userId,
          reportId,
        })
        return NextResponse.json({ error: "internal" }, { status: 500 })
      }

      if (!report) {
        return NextResponse.json({ error: "not found or already resolved" }, { status: 404 })
      }

      return NextResponse.json({ ok: true, action: "resolve", report })
    }

    const { data: report, error: lookupError } = await supabase
      .from("reports")
      .select("target_type, target_id")
      .eq("id", reportId)
      .single()

    if (lookupError || !report) {
      return NextResponse.json({ error: "not found" }, { status: 404 })
    }

    let hideResult: { error: { message: string } | null } = { error: null }
    if (report.target_type === "post") {
      hideResult = await supabase
        .from("posts")
        .update({ is_deleted: true })
        .eq("id", report.target_id)
    } else if (report.target_type === "comment") {
      hideResult = await supabase
        .from("comments")
        .update({ is_deleted: true })
        .eq("id", report.target_id)
    } else if (report.target_type === "group") {
      hideResult = await supabase
        .from("groups")
        .update({ is_deleted: true })
        .eq("id", report.target_id)
    } else {
      return NextResponse.json({ error: "unknown target_type" }, { status: 500 })
    }

    if (hideResult.error) {
      log.error("hide failed", {
        error: hideResult.error.message,
        userId,
        reportId,
        target_type: report.target_type,
      })
      return NextResponse.json({ error: "internal" }, { status: 500 })
    }

    const autoNote = note ?? `content hidden (${report.target_type})`
    const { error: resolveError } = await supabase
      .from("reports")
      .update({
        status: "resolved",
        operator_note: autoNote,
        resolved_by: userId,
        resolved_at: resolvedAt,
      })
      .eq("id", reportId)
      .eq("status", "open")

    if (resolveError) {
      log.error("resolve after hide failed (target already hidden)", {
        error: resolveError.message,
        userId,
        reportId,
      })
    }

    return NextResponse.json({ ok: true, action: "hide", reportId })
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
