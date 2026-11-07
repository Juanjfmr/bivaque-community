import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { removeReviewedDocuments } from "../../../../lib/admin/document-removals"
import { createServerClient } from "../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Job interno: mesmo segredo e ponte Vault do outbox; nenhuma sessão de membro autoriza este job.
export async function POST(request: Request) {
  const expected = process.env["OUTBOX_WORKER_SECRET"]
  if (!expected) return NextResponse.json({ error: "unavailable" }, { status: 503 })
  const provided = request.headers.get("x-outbox-secret") ?? ""
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const ok = await removeReviewedDocuments(createServerClient(), null)
  return NextResponse.json({ ok }, { status: ok ? 200 : 503 })
}
