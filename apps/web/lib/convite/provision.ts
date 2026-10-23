import { CONSENT_VERSION } from "@bivaque/domain"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { byteaDigestParam } from "../invites-bytea"
import { provisionMember } from "../onboarding/verifyAndProvision"
import { asFamilyInviteCodeStatus } from "./code"

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
//      aqui inventa um segundo fluxo de admissão. Como o vínculo e o
//      provisionamento não são a mesma transação, a conclusão é retomável —
//      ver `ensureFamilyMember`.
//
// Nada neste arquivo confia em identidade vinda do cliente: `userId` é sempre
// resolvido da sessão pela Server Action, nunca do formulário.

type AnySupabaseClient = SupabaseClient<Database>

// O banco devolve status, não exceção (20261023120000): a exceção desfaria o
// insert da tentativa e o limite de tentativas nunca contaria erro. Por isso
// nenhuma das duas funções abaixo traduz "código errado" em `throw` — só falha
// de infraestrutura continua sendo exceção.
export type FamilyInvitePreview =
  | Readonly<{
      expiresAt: string
      inviteeEmailHint: string | null
      inviterName: string
      status: "ok"
    }>
  | Readonly<{ status: "unavailable" | "email_mismatch" | "rate_limited" }>

export type FamilyInviteAcceptance =
  | Readonly<{ linkId: string; localityMember: boolean; status: "ok" }>
  | Readonly<{ status: "unavailable" | "rate_limited" }>

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
    throw new Error("family invite preview returned no row")
  }

  const status = asFamilyInviteCodeStatus(row.status)
  if (status !== "ok") {
    return { status }
  }

  return {
    expiresAt: row.expires_at,
    inviteeEmailHint: row.invitee_email_hint,
    inviterName: row.inviter_name,
    status,
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
): Promise<FamilyInviteAcceptance> {
  const { data, error } = await supabase.rpc("family_invite_code_accept", {
    p_accepted_by_user_id: input.userId,
    p_code_hash: byteaDigestParam(input.codeHash),
    p_origin_digest: byteaDigestParam(input.originDigest),
  })

  if (error) {
    throw withCode(error, "family invite acceptance failed")
  }

  const row = data?.[0]
  if (!row) {
    throw new Error("family invite acceptance returned no row")
  }

  const status = asFamilyInviteCodeStatus(row.status)
  if (status !== "ok") {
    // O vínculo não existe — e-mail diferente, corrida perdida ou limite —, mas
    // a tentativa já está gravada no banco: foi a transação do RPC que a
    // confirmou, justamente porque a função devolve status em vez de lançar.
    // O aceite nunca devolve `email_mismatch` (lá o código já é a credencial e
    // a resposta é a genérica); se aparecesse, cairia em `unavailable`.
    return { status: status === "rate_limited" ? "rate_limited" : "unavailable" }
  }

  const linkId = row.link_id

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

  const member = await ensureFamilyMember(supabase, {
    userId: input.userId,
    localityId: holderLocalityId,
    displayName: input.displayName,
    consentVersion: CONSENT_VERSION,
  })

  return { linkId, localityMember: member.localityMember, status }
}

// O aceite (vínculo) e o provisionamento são dois passos, e o primeiro confirma
// no banco antes do segundo. Uma falha no meio — a consulta da localidade ou o
// RPC de provisionamento — deixaria a conta criada, o convite usado e a pessoa
// sem acesso, e a nova tentativa receberia "usado". A conclusão é, então,
// RETOMÁVEL: `family_invite_code_accept` devolve `ok` e o mesmo vínculo para o
// mesmo aceitante (20261023120000), e esta função conclui o que faltou.
//
// A retomada NÃO chama `provisionMember` quando a pessoa já tem localidade
// corrente: `provision_member_locality` transforma a corrente em `leaving`
// antes de inserir a nova, então repetir o caminho moveria de volta quem já se
// estabeleceu — e, na mesma localidade, deixaria a pessoa sem corrente nenhuma
// (o insert conflita e não vira `current`). O perfil, esse sim, é garantido:
// uma tentativa anterior pode ter criado a localidade e caído antes do perfil.
async function ensureFamilyMember(
  supabase: AnySupabaseClient,
  input: Readonly<{
    userId: string
    localityId: string
    displayName: string
    consentVersion: number
  }>,
): Promise<{ localityMember: boolean }> {
  const { data: current, error: currentError } = await supabase
    .from("locality_memberships")
    .select("locality_id")
    .eq("user_id", input.userId)
    .eq("kind", "current")
    .limit(1)

  if (currentError) {
    throw new Error(`Failed to read the current membership: ${currentError.message}`)
  }

  if ((current ?? []).length === 0) {
    return provisionMember(supabase, input)
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    user_id: input.userId,
    display_name: input.displayName,
    visibility: "locality_members" as const,
    consent_version: input.consentVersion,
    consented_at: new Date().toISOString(),
  })

  if (profileError) {
    throw new Error(`Failed to create profile: ${profileError.message}`)
  }

  return { localityMember: true }
}
