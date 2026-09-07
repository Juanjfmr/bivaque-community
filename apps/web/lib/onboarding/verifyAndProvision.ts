import { CONSENT_VERSION } from "@bivaque/domain"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { byteaDigestParam } from "../invites-bytea"
import type { VerificationResult } from "../portal"
import { createPortalVerificationGuard, verifyCpfWithErrorCode } from "../portal"

// P0 Task 4: eligibility and provisioning split into two phases
// (ADR-20260816-forma-da-admissao). verify answers "is this person eligible?"
// and stops — it never writes to locality_memberships or profiles. provision
// receives a locality and a name ALREADY VALIDATED and creates the membership
// and the profile. The pending reconciliation job (D2) reuses verify and
// therefore never provisions either: there is no locality to store on a
// pending, because the question has not been asked yet. No
// intended_locality_id column on verification_outcomes (LGPD: purpose
// without a purpose).

export interface OnboardingVerifyInput {
  userId: string
  cpf: string
  consentVersion: number
}

export interface OnboardingProvisionInput {
  userId: string
  // Obrigatório, sem default: um default aqui é PILOT_LOCALITY_ID disfarçado.
  localityId: string
  displayName: string
  consentVersion: number
}

type AnySupabaseClient = SupabaseClient<Database>

export async function verifyEligibility(
  supabase: AnySupabaseClient,
  input: OnboardingVerifyInput,
): Promise<{ outcome: VerificationResult }> {
  const { userId, cpf, consentVersion } = input

  if (consentVersion < CONSENT_VERSION) {
    throw new Error("consent version not accepted")
  }

  const apiKey = process.env["PORTAL_DADOS_API_KEY"]
  if (!apiKey) {
    throw new Error("PORTAL_DADOS_API_KEY is required for verification")
  }

  const portalGuard = await createPortalVerificationGuard()
  if (portalGuard && !(await portalGuard.allows(userId))) {
    return { outcome: { status: "pending" } }
  }

  // Anti-enumeration gate: at most three Portal attempts per rolling hour.
  // The response below is generic so the browser cannot distinguish a CPF
  // that is absent from a CPF that is merely rate-limited.
  const { data: canAttempt, error: attemptError } = await supabase.rpc(
    "consume_verification_attempt",
    { p_user_id: userId },
  )

  if (attemptError) {
    throw new Error(`Failed to consume verification attempt: ${attemptError.message}`)
  }

  if (canAttempt !== true) {
    return { outcome: { status: "pending" } }
  }

  const attempt = await verifyCpfWithErrorCode(cpf, apiKey)
  const outcome = attempt.result

  if (attempt.errorCode === "RATE_LIMITED" && portalGuard) {
    await portalGuard.trip()
  }

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

  // Para aqui. Nada de membership, nada de profile: a localidade ainda não
  // foi informada (passo pós-elegibilidade) e o nome ainda não foi confirmado.
  return { outcome }
}

export async function provisionMember(
  supabase: AnySupabaseClient,
  input: OnboardingProvisionInput,
): Promise<{ localityMember: boolean }> {
  const { userId, localityId, displayName, consentVersion } = input

  if (consentVersion < CONSENT_VERSION) {
    throw new Error("consent version not accepted")
  }

  if (localityId.length === 0) {
    // Erro explícito, nunca silêncio: sem localidade não há membership.
    throw new Error("locality is required to provision a member")
  }

  // Provision through the SECURITY DEFINER helper (migration 20260819021416):
  // it converts the existing current to leaving and creates the new current,
  // so the partial unique index on (user_id) WHERE kind = 'current' is never
  // violated. A direct upsert fails for a user who already holds a current
  // membership elsewhere — which the T1 model allows.
  const { error: membershipError } = await supabase.rpc("provision_member_locality", {
    p_user_id: userId,
    p_locality_id: localityId,
  })

  if (membershipError) {
    throw new Error(`Failed to create membership: ${membershipError.message}`)
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    user_id: userId,
    display_name: displayName,
    visibility: "locality_members" as const,
    consent_version: CONSENT_VERSION,
    consented_at: new Date().toISOString(),
  })

  if (profileError) {
    throw new Error(`Failed to create profile: ${profileError.message}`)
  }

  return { localityMember: true }
}

export async function addToWaitlist(
  supabase: AnySupabaseClient,
  email: string,
  cityName: string,
  stateCode: string,
): Promise<{ waitlistEntry: boolean }> {
  const { error } = await supabase.rpc("add_to_waitlist", {
    p_email: email,
    p_city_name: cityName,
    p_state_code: stateCode,
  })

  if (error) {
    throw new Error(`Failed to join waitlist: ${error.message}`)
  }

  return { waitlistEntry: true }
}

export interface FamilyAcceptInput {
  tokenHex: string
  userId: string
  displayName: string
  consentVersion: number
}

export async function acceptFamilyInvitationAndProvision(
  supabase: AnySupabaseClient,
  input: FamilyAcceptInput,
): Promise<{ localityMember: boolean }> {
  const { tokenHex, userId, displayName, consentVersion } = input

  if (consentVersion < CONSENT_VERSION) {
    throw new Error("consent version not accepted")
  }

  const { data: linkId, error } = await supabase.rpc("accept_family_invitation", {
    p_token_digest: byteaDigestParam(tokenHex),
    p_accepted_by_user_id: userId,
  })

  if (error) {
    // Preserve the Postgres errcode so the route can map the four sad
    // paths (D2 Task 5) and so the generic 500 never echoes the database
    // message. The thrown message is still generic; the detail lives in the
    // log.
    const wrapped = new Error(`Family invitation acceptance failed: ${error.message}`)
    ;(wrapped as { code?: string }).code = error.code
    throw wrapped
  }

  if (!linkId) {
    throw new Error("Family invitation acceptance returned no link id")
  }

  // A localidade do dependente é a corrente do titular no momento do aceite
  // (ADR-20260816-national-localities emenda; a onda de transferência adiciona
  // o vínculo de saída — "corrente, não de saída"). O convite familiar é a
  // única via que concede acesso sem CPF (D16), com cota de 5 por titular: o
  // dependente nunca escolhe a própria localidade. O titular é o holder do
  // family_account_links criado pelo aceite — não o usuário que está aceitando.
  const { data: holderLocalityId, error: holderError } = await supabase.rpc(
    "family_accept_holder_locality",
    { p_link_id: linkId },
  )

  if (holderError) {
    throw new Error(`Failed to resolve the holder locality: ${holderError.message}`)
  }

  if (!holderLocalityId) {
    // Titular sem membership não pode provisionar dependente (nunca gravar nulo).
    throw new Error("the inviting holder has no locality membership")
  }

  return provisionMember(supabase, {
    userId,
    localityId: holderLocalityId,
    displayName,
    consentVersion,
  })
}
