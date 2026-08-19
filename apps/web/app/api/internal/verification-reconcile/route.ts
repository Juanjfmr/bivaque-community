import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { log } from "../../../../lib/logger"
import { createServerClient } from "../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Same ceiling as the outbox worker: bounded batches, never a sweep of the
// whole pending population in one request.
const MAX_BATCH = 20

function secretMatches(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  )
}

export async function POST(request: Request) {
  const expectedSecret = process.env["RECONCILE_WORKER_SECRET"]
  if (!expectedSecret) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 })
  }

  const providedSecret = request.headers.get("x-reconcile-secret")
  if (!providedSecret || !secretMatches(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const rawIds = (body as { user_ids?: unknown }).user_ids
  if (!Array.isArray(rawIds)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const ids = rawIds.filter((id): id is string => typeof id === "string" && id.length > 0)
  if (ids.length === 0 || ids.length > MAX_BATCH) {
    return NextResponse.json({ error: "invalid_batch" }, { status: 400 })
  }

  // The decision lives in the RPC (supabase/tests/verification-reconcile.sql
  // proves it). This route only authenticates the bridge and runs the step per
  // id. It never consumes the user's browser attempt quota:
  // consume_verification_attempt is anti-enumeration against the browser, and
  // the job is not the browser — burning it on a capped person would strand
  // her forever.
  const supabase = createServerClient()

  const results = await Promise.all(
    ids.map(async (id) => {
      const { data, error } = await supabase.rpc("verification_reconcile_step", {
        p_user_id: id,
      })
      if (error) {
        log.error("verification reconcile step failed", { user_id: id, error: error.message })
        return { user_id: id, outcome: "error" }
      }
      return { user_id: id, outcome: data ?? "error" }
    }),
  )

  const rejected = results.filter((r) => r.outcome === "rejected").length
  const deferred = results.filter((r) => r.outcome === "deferred").length
  const resolved = results.filter((r) => r.outcome === "resolved").length
  const errors = results.filter((r) => r.outcome === "error").length

  log.info("verification reconcile processed batch", {
    processed: results.length,
    rejected,
    deferred,
    resolved,
    errors,
  })

  return NextResponse.json({ processed: results.length, rejected, deferred, resolved, errors })
}
