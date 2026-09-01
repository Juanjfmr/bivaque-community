import { CODE_OF_CONDUCT_VERSION, CONSENT_VERSION } from "@bivaque/domain"
import { NextResponse } from "next/server"
import { log } from "../../../../lib/logger"
import { createServerClient } from "../../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VERIFICATION_STATUS_VALUES = ["pending", "verified", "rejected", "temporary_error"] as const

const ELIGIBILITY_CLASS_VALUES = [
  "active_federal_military",
  "veteran",
  "military_pensioner",
] as const

type VerificationStatus = (typeof VERIFICATION_STATUS_VALUES)[number]
type EligibilityClass = (typeof ELIGIBILITY_CLASS_VALUES)[number]

interface StatusResponse {
  status: VerificationStatus | null
  checked_at: string | null
  updated_at: string | null
  eligibility_class: EligibilityClass | null
  localityMember: boolean
  hasAcceptedConsent: boolean
}

interface OutcomeRpcRow {
  status: string
  eligibility_class: string | null
  checked_at: string | null
  updated_at: string
}

export async function GET(request: Request) {
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

  try {
    const [outcomeResult, membershipResult, consentResult] = await Promise.all([
      supabase.rpc("read_verification_status", { p_user_id: userId }),
      supabase
        .from("locality_memberships")
        .select("locality_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle(),
      supabase.rpc("has_accepted_consent", {
        p_user_id: userId,
        p_consent_version: CONSENT_VERSION,
        p_code_of_conduct_version: CODE_OF_CONDUCT_VERSION,
      }),
    ])

    if (outcomeResult.error) {
      log.error("failed to read verification outcome", {
        error: outcomeResult.error.message,
        userId,
      })
      return NextResponse.json({ error: "internal" }, { status: 500 })
    }

    if (membershipResult.error) {
      log.error("failed to read locality membership", {
        error: membershipResult.error.message,
        userId,
      })
      return NextResponse.json({ error: "internal" }, { status: 500 })
    }
    if (consentResult.error) {
      log.error("failed to read consent status", { error: consentResult.error.message, userId })
      return NextResponse.json({ error: "internal" }, { status: 500 })
    }

    const outcomeRows = outcomeResult.data as OutcomeRpcRow[] | null
    const row = outcomeRows?.[0] ?? null

    const response: StatusResponse = {
      status: (row?.status as VerificationStatus | undefined) ?? null,
      checked_at: row?.checked_at ?? null,
      updated_at: row?.updated_at ?? null,
      eligibility_class: (row?.eligibility_class as EligibilityClass | null) ?? null,
      localityMember: membershipResult.data !== null,
      hasAcceptedConsent: consentResult.data === true,
    }

    return NextResponse.json(response)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "internal server error"
    log.error("onboarding status failed", { error: message, userId })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
