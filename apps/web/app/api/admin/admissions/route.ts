import { NextResponse } from "next/server"
import { log } from "../../../../lib/logger"
import { createServerClient } from "../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

  const { data: queue, error: queueError } = await supabase.rpc("list_verification_queue")

  if (queueError) {
    log.error("admissions queue read failed", { error: queueError.message, userId })
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }

  return NextResponse.json({ queue: queue ?? [] })
}
