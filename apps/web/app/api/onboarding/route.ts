import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { log } from "../../../lib/logger"
import {
  acceptFamilyInvitationAndProvision,
  addToWaitlist,
  verifyAndProvision,
} from "../../../lib/onboarding/verifyAndProvision"
import { createServerClient } from "../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
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

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const cookieStore = await cookies()
  const consentVersionStr = cookieStore.get("bivaque-consent-version")?.value ?? "0"
  const consentVersion = Number.parseInt(consentVersionStr, 10)

  const action = body["action"]

  try {
    if (action === "verify-cpf") {
      const cpf = body["cpf"]
      if (typeof cpf !== "string" || cpf.length === 0) {
        return NextResponse.json({ error: "cpf is required" }, { status: 400 })
      }

      const result = await verifyAndProvision(supabase, { userId, cpf, consentVersion })
      return NextResponse.json(result)
    }

    if (action === "accept-family-invite") {
      const tokenHex = body["token"]
      if (typeof tokenHex !== "string" || tokenHex.length === 0) {
        return NextResponse.json({ error: "token is required" }, { status: 400 })
      }

      const result = await acceptFamilyInvitationAndProvision(
        supabase,
        tokenHex,
        userId,
        consentVersion,
      )
      return NextResponse.json(result)
    }

    if (action === "join-waitlist") {
      const email = body["email"]
      const localityId = body["locality_id"]

      if (typeof email !== "string" || email.length === 0) {
        return NextResponse.json({ error: "email is required" }, { status: 400 })
      }

      if (typeof localityId !== "string" || localityId.length === 0) {
        return NextResponse.json({ error: "locality_id is required" }, { status: 400 })
      }

      const result = await addToWaitlist(supabase, email, localityId)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "internal server error"
    log.error("onboarding request failed", { error: message, action: body["action"] as string })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
