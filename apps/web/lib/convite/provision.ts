import { CONSENT_VERSION } from "@bivaque/domain"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { byteaDigestParam } from "../invites-bytea"
import { asFamilyInviteCodeStatus } from "./code"

// PORT-006 (lote 4 da entrada) — o lado servidor do convite por código.
//
// Duas responsabilidades, e nenhuma delas decide acesso sozinha:
//   1. `previewFamilyInviteCode` só lê o que a tela mostra (nome de quem
//      convidou, rótulo mascarado do e-mail, prazo). A validação, o limite de
//      tentativas e a resposta única moram no banco (20261023120000).
//   2. `acceptFamilyInviteCode` consome o código e conclui TUDO no banco, numa
//      transação só: o vínculo com `private.accept_family_invitation`, a
//      localidade corrente do titular, a membership e o perfil. Não existe
//      provisionamento em TypeScript aqui — ele morava neste arquivo e foi o
//      que produziu "convite consumido sem acesso" e a corrida entre dois
//      aceites. Delegar é o que garante a atomicidade: qualquer falha desfaz o
//      aceite e o convite volta a `pending`.
//
// Nada neste arquivo confia em identidade vinda do cliente: `userId` é sempre
// resolvido da sessão pela Server Action, nunca do formulário.

type AnySupabaseClient = SupabaseClient<Database>

// O banco devolve status, não exceção (20261023120000): a exceção desfaria o
// insert da tentativa e o limite de tentativas nunca contaria erro. Por isso
// nenhuma das duas funções abaixo traduz "código errado" em `throw` — só falha
// de infraestrutura (e falha de contrato do aceite, como titular sem localidade
// corrente) continua sendo exceção.
export type FamilyInvitePreview =
  | Readonly<{
      expiresAt: string
      inviteeEmailHint: string | null
      inviterName: string
      status: "ok"
    }>
  | Readonly<{ status: "unavailable" | "email_mismatch" | "rate_limited" }>

// `localityMember` é constante: o aceite só responde `ok` depois de a membership
// corrente existir, na mesma transação. O campo fica para a leitura de quem
// chama não precisar saber disso.
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
    p_consent_version: CONSENT_VERSION,
    p_display_name: input.displayName,
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

  return { linkId: row.link_id, localityMember: true, status }
}
