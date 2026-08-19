import { CODE_OF_CONDUCT_VERSION, CONSENT_VERSION, isValidCpf } from "@bivaque/domain"
import { NextResponse } from "next/server"
import { log } from "../../../lib/logger"
import { validateProvisionInput } from "../../../lib/onboarding/provision-validation"
import {
  acceptFamilyInvitationAndProvision,
  addToWaitlist,
  provisionMember,
  verifyEligibility,
} from "../../../lib/onboarding/verifyAndProvision"
import { createServerClient } from "../../../lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface OnboardingRequestBody {
  action?: string
  cpf?: string
  token?: string
  email?: string
  city_name?: string
  state_code?: string
  display_name?: string
  ibge_code?: string
}

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

  let body: OnboardingRequestBody
  try {
    body = (await request.json()) as OnboardingRequestBody
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const action = body.action

  // The consent cookie is a navigation shortcut (middleware), never the
  // authority. The check below uses the deployed constant versions, so a
  // forged or stale cookie cannot accept on the user's behalf —
  // has_accepted_consent still requires a real acceptance row for both
  // current versions (D2 Task 3 single source).
  const consentVersion = CONSENT_VERSION
  const codeOfConductVersion = CODE_OF_CONDUCT_VERSION

  try {
    const { data: hasAcceptedConsent } = await supabase.rpc("has_accepted_consent", {
      p_user_id: userId,
      p_consent_version: consentVersion,
      p_code_of_conduct_version: codeOfConductVersion,
    })

    if (!hasAcceptedConsent) {
      return NextResponse.json({ error: "consent is required" }, { status: 403 })
    }

    if (action === "verify-cpf") {
      const cpf = body.cpf
      if (typeof cpf !== "string" || cpf.length === 0) {
        return NextResponse.json({ error: "cpf is required" }, { status: 400 })
      }
      if (!isValidCpf(cpf)) {
        return NextResponse.json({ error: "cpf is invalid" }, { status: 400 })
      }

      const result = await verifyEligibility(supabase, { userId, cpf, consentVersion })
      return NextResponse.json(result)
    }

    if (action === "provision") {
      // P0 Task 5: o passo pós-elegibilidade. A localidade é validada contra o
      // catálogo canônico ANTES de provisionar — nunca texto livre de cidade,
      // e nunca um código de formato certo mas ausente do catálogo.
      const validation = validateProvisionInput({
        ibgeCode: typeof body.ibge_code === "string" ? body.ibge_code : "",
        displayName: typeof body.display_name === "string" ? body.display_name : "",
      })

      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }

      const localityCode = validation.ibgeCode as string
      const { data: locality, error: localityError } = await supabase
        .from("localities")
        .select("id, ibge_code")
        .eq("ibge_code", localityCode)
        .maybeSingle()

      if (localityError) {
        throw new Error(`Failed to validate locality: ${localityError.message}`)
      }
      if (!locality) {
        // Formato certo mas ausente do catálogo: 400, sem eco de mensagem de banco.
        return NextResponse.json({ error: "locality is unknown" }, { status: 400 })
      }

      const result = await provisionMember(supabase, {
        userId,
        localityId: locality.id,
        displayName: validation.displayName as string,
        consentVersion,
      })
      return NextResponse.json(result)
    }

    if (action === "accept-family-invite") {
      const tokenHex = body.token
      if (typeof tokenHex !== "string" || tokenHex.length === 0) {
        return NextResponse.json({ error: "token is required" }, { status: 400 })
      }

      const displayName = body.display_name
      if (typeof displayName !== "string" || displayName.trim().length < 2) {
        return NextResponse.json({ error: "display_name is required" }, { status: 400 })
      }

      const result = await acceptFamilyInvitationAndProvision(supabase, {
        tokenHex,
        userId,
        displayName: displayName.trim(),
        consentVersion,
      })
      return NextResponse.json(result)
    }

    if (action === "join-waitlist") {
      const email = body.email
      const cityName = body.city_name
      const stateCode = body.state_code

      if (typeof email !== "string" || email.length === 0) {
        return NextResponse.json({ error: "email is required" }, { status: 400 })
      }

      if (typeof cityName !== "string" || cityName.length === 0) {
        return NextResponse.json({ error: "city_name is required" }, { status: 400 })
      }

      if (typeof stateCode !== "string" || (stateCode.length !== 0 && stateCode.length !== 2)) {
        return NextResponse.json({ error: "state_code is invalid" }, { status: 400 })
      }

      const result = await addToWaitlist(supabase, email, cityName, stateCode)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "internal server error"
    log.error("onboarding request failed", { error: message, action: body.action as string })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
