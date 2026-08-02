import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import type { VerificationResult } from "../portal"
import { verifyCpf } from "../portal"

const MANAUS_LOCALITY_ID = "00000000-0000-4000-8000-000000000001"
const CURRENT_CONSENT_VERSION = 1

export interface OnboardingVerifyInput {
  userId: string
  cpf: string
  consentVersion: number
}

export interface OnboardingVerifyOutput {
  outcome: VerificationResult
  localityMember: boolean
  waitlistEntry: boolean
}

type AnySupabaseClient = SupabaseClient<Database>

export async function verifyAndProvision(
  supabase: AnySupabaseClient,
  input: OnboardingVerifyInput,
): Promise<OnboardingVerifyOutput> {
  const { userId, cpf, consentVersion } = input

  if (consentVersion < CURRENT_CONSENT_VERSION) {
    throw new Error("consent version not accepted")
  }

  const apiKey = process.env["PORTAL_DADOS_API_KEY"]
  if (!apiKey) {
    throw new Error("PORTAL_DADOS_API_KEY is required for verification")
  }

  const outcome = await verifyCpf(cpf, apiKey)

  const rpcArgs =
    outcome.status === "verified"
      ? {
          p_user_id: userId,
          p_status: outcome.status,
          p_eligibility_class: outcome.eligibilityClass,
        }
      : { p_user_id: userId, p_status: outcome.status }

  const { error: rpcError } = await supabase.rpc("upsert_verification_outcome", rpcArgs)

  if (rpcError) {
    throw new Error(`Failed to upsert verification outcome: ${rpcError.message}`)
  }

  let localityMember = false

  if (outcome.status === "verified") {
    const { error: membershipError } = await supabase
      .from("locality_memberships")
      .upsert({ user_id: userId, locality_id: MANAUS_LOCALITY_ID })

    if (membershipError) {
      throw new Error(`Failed to create membership: ${membershipError.message}`)
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      user_id: userId,
      locality_id: MANAUS_LOCALITY_ID,
      display_name: "Novo membro",
      visibility: "locality_members" as const,
      consent_version: CURRENT_CONSENT_VERSION,
      consented_at: new Date().toISOString(),
    })

    if (profileError) {
      throw new Error(`Failed to create profile: ${profileError.message}`)
    }

    localityMember = true
  }

  return { outcome, localityMember, waitlistEntry: false }
}

export async function addToWaitlist(
  supabase: AnySupabaseClient,
  email: string,
  localityId: string,
): Promise<{ waitlistEntry: boolean }> {
  const { error } = await supabase.rpc("add_to_waitlist", {
    p_email: email,
    p_locality_id: localityId,
  })

  if (error) {
    throw new Error(`Failed to join waitlist: ${error.message}`)
  }

  return { waitlistEntry: true }
}

export async function acceptFamilyInvitationAndProvision(
  supabase: AnySupabaseClient,
  tokenHex: string,
  userId: string,
  consentVersion: number,
): Promise<{ localityMember: boolean }> {
  if (consentVersion < CURRENT_CONSENT_VERSION) {
    throw new Error("consent version not accepted")
  }

  const { data, error } = await supabase.rpc("accept_family_invitation", {
    p_token_digest: tokenHex,
    p_accepted_by_user_id: userId,
  })

  if (error) {
    throw new Error(`Family invitation acceptance failed: ${error.message}`)
  }

  if (!data) {
    throw new Error("Family invitation acceptance returned no link id")
  }

  const { error: membershipError } = await supabase
    .from("locality_memberships")
    .upsert({ user_id: userId, locality_id: MANAUS_LOCALITY_ID })

  if (membershipError) {
    throw new Error(`Failed to create membership: ${membershipError.message}`)
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    user_id: userId,
    locality_id: MANAUS_LOCALITY_ID,
    display_name: "Novo membro",
    visibility: "locality_members" as const,
    consent_version: CURRENT_CONSENT_VERSION,
    consented_at: new Date().toISOString(),
  })

  if (profileError) {
    throw new Error(`Failed to create profile: ${profileError.message}`)
  }

  return { localityMember: true }
}
