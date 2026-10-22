import { CONSENT_VERSION } from "@bivaque/domain"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { byteaDigestParam } from "../invites-bytea"
import { provisionMember } from "../onboarding/verifyAndProvision"

// PORT-006 (lote 4 da entrada) — o lado servidor do convite por código.
//
// Duas responsabilidades, e nenhuma delas decide acesso sozinha:
//   1. `previewFamilyInviteCode` só lê o que a tela mostra (nome de quem
//      convidou, rótulo mascarado do e-mail, prazo). A validação, o limite de
//      tentativas e a resposta única moram no banco (20261023120000).
//   2. `acceptFamilyInviteCode` consome o código e delega o vínculo a
//      `private.accept_family_invitation`, via RPC. O provisionamento reusa
//      `provisionMember`, que é o mesmo caminho do titular verificado: a
//      localidade é a do convite, o perfil nasce com o aceite gravado e nada
//      aqui inventa um segundo fluxo de admissão.
//
// Nada neste arquivo confia em identidade vinda do cliente: `userId` é sempre
// resolvido da sessão pela Server Action, nunca do formulário.

type AnySupabaseClient = SupabaseClient<Database>

export type FamilyInvitePreview = Readonly<{
  expiresAt: string
  inviteeEmailHint: string | null
  inviterName: string
}>

function withCode(error: { code?: string | null; message: string }, prefix: string): Error {
  const wrapped = new Error(`${prefix}: ${error.message}`)
  ;(wrapped as { code?: string | null }).code = error.code ?? null
  return wrapped
}

export async function previewFamilyInviteCode(
  supabase: AnySupabaseClient,
  input: Readonly<{
    codeHash: string
    emailDigest?: string | undefined
    originDigest: string
  }>,
): Promise<FamilyInvitePreview> {
  const { data, error } = await supabase.rpc("family_invite_code_preview", {
    p_code_hash: byteaDigestParam(input.codeHash),
    p_origin_digest: byteaDigestParam(input.originDigest),
    ...(input.emailDigest === undefined
      ? {}
      : { p_email_digest: byteaDigestParam(input.emailDigest) }),
  })

  if (error) {
    throw withCode(error, "family invite preview failed")
  }

  const row = data?.[0]
  if (!row) {
    // Sem linha e sem erro não é "convite válido vazio": é resposta quebrada.
    const wrapped = new Error("family invite preview returned no row")
    ;(wrapped as { code?: string | null }).code = "P0001"
    throw wrapped
  }

  return {
    expiresAt: row.expires_at,
    inviteeEmailHint: row.invitee_email_hint,
    inviterName: row.inviter_name,
  }
}

export async function acceptFamilyInviteCode(
  supabase: AnySupabaseClient,
  input: Readonly<{
    codeHash: string
    displayName: string
    originDigest: string
    userId: string
  }>,
): Promise<{ localityMember: boolean }> {
  const { data: linkId, error } = await supabase.rpc("family_invite_code_accept", {
    p_accepted_by_user_id: input.userId,
    p_code_hash: byteaDigestParam(input.codeHash),
    p_origin_digest: byteaDigestParam(input.originDigest),
  })

  if (error) {
    throw withCode(error, "family invite acceptance failed")
  }

  if (!linkId) {
    throw new Error("family invite acceptance returned no link id")
  }

  // A localidade do dependente é a corrente do titular no momento do aceite —
  // a mesma regra do convite por link (`accept_family_invitation`). O
  // dependente nunca escolhe a própria localidade.
  const { data: holderLocalityId, error: holderError } = await supabase.rpc(
    "family_accept_holder_locality",
    { p_link_id: linkId },
  )

  if (holderError) {
    throw new Error(`Failed to resolve the holder locality: ${holderError.message}`)
  }

  if (!holderLocalityId) {
    throw new Error("the inviting holder has no locality membership")
  }

  return provisionMember(supabase, {
    userId: input.userId,
    localityId: holderLocalityId,
    displayName: input.displayName,
    consentVersion: CONSENT_VERSION,
  })
}
