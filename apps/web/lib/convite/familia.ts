import { createHash, randomBytes } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { byteaDigestParam } from "../invites-bytea"
import {
  generateInviteCode,
  inviteCodeHash,
  inviteEmailDigest,
  normalizeInviteEmail,
} from "./digest"
import { emailHint } from "./hint"

/**
 * A família do titular (RUN-018): um módulo, duas portas.
 *
 * A tela antiga do `apps/web` (Server Actions em
 * `app/(shell)/profile/family-invite-section-actions.ts`) e as rotas
 * `/api/app/voce/familia` do app leem e gravam por aqui. As regras são as do
 * banco, não uma cópia: titular verificado, teto de 5 convites ativos, 7 dias,
 * só o próprio titular revoga (ver `supabase/tests/family-invite-wrappers.sql`).
 *
 * O `userId` NUNCA vem do corpo, da query ou do app — quem chama resolve a
 * sessão e passa o id dela. As funções públicas de família têm `execute` só
 * para `service_role` (migration 20260806160942), então o cliente de serviço é
 * a única porta ao banco aqui; ele só é usado depois que a sessão foi
 * resolvida, e só para estas quatro funções.
 */

type Cliente = SupabaseClient<Database>

export type ConvitePendente = Readonly<{
  id: string
  emailMascarado: string | null
  criadoEm: string
  expiraEm: string
}>

export type FamiliaDoTitular = Readonly<{
  podeConvidar: boolean
  pendentes: readonly ConvitePendente[]
}>

export type MotivoDeRecusa =
  | "email-invalido"
  | "nao-titular"
  | "teto-de-convites"
  | "convite-nao-encontrado"
  | "banco"

/** Recusa de família com motivo curto: a rota traduz em status, a tela em frase. */
export class FalhaDeConvite extends Error {
  readonly motivo: MotivoDeRecusa

  constructor(motivo: MotivoDeRecusa, mensagem: string) {
    super(mensagem)
    this.name = "FalhaDeConvite"
    this.motivo = motivo
  }
}

// A mesma régua da tela antiga desde a prancha 52.
const REGRA_DE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** `null` quando o e-mail serve; a frase da recusa quando não. */
export function validarEmailDeConvite(email: unknown): string | null {
  if (typeof email !== "string") return "Informe o e-mail do familiar."
  return REGRA_DE_EMAIL.test(email.trim()) ? null : "email inválido"
}

function lerPendente(linha: {
  id: string
  invitee_email_hint: string | null
  created_at: string
  expires_at: string
}): ConvitePendente {
  return {
    id: linha.id,
    emailMascarado: linha.invitee_email_hint,
    criadoEm: linha.created_at,
    expiraEm: linha.expires_at,
  }
}

async function titularVerificado(client: Cliente, userId: string): Promise<boolean> {
  const { data, error } = await client.rpc("is_verified_holder", { p_user_id: userId })
  if (error) throw new FalhaDeConvite("banco", "Não foi possível conferir a verificação agora.")
  return data === true
}

/** Os convites pendentes do titular e se ele pode convidar. */
export async function lerFamilia(client: Cliente, userId: string): Promise<FamiliaDoTitular> {
  const [podeConvidar, pendentes] = await Promise.all([
    titularVerificado(client, userId),
    client.rpc("list_pending_invites_with_hint", { p_user_id: userId }),
  ])
  if (pendentes.error) {
    throw new FalhaDeConvite("banco", "Não foi possível ler os convites agora.")
  }
  const linhas = (pendentes.data ?? []) as readonly {
    id: string
    invitee_email_hint: string | null
    created_at: string
    expires_at: string
  }[]
  return { podeConvidar, pendentes: linhas.map(lerPendente) }
}

/**
 * Cria o convite e enfileira a entrega.
 *
 * O código e o token em claro existem só no retorno: o banco guarda o digest
 * (20261023120000) e o outbox é o único lugar por onde o e-mail sai. A rota do
 * app NÃO devolve nenhum dos dois — o familiar entra pelo e-mail.
 */
export async function enviarConvite(
  client: Cliente,
  userId: string,
  email: unknown,
): Promise<{ convite: ConvitePendente; codigo: string; token: string }> {
  const problema = validarEmailDeConvite(email)
  if (problema !== null) throw new FalhaDeConvite("email-invalido", problema)
  const normalizado = normalizeInviteEmail(email as string)

  if (!(await titularVerificado(client, userId))) {
    throw new FalhaDeConvite("nao-titular", "Apenas titulares verificados podem enviar convites.")
  }

  const token = randomBytes(32)
  const tokenDigest = createHash("sha256").update(token).digest("hex")
  // O código é o que a pessoa pode ditar ou digitar quando o link se perde
  // (ADR-20261022-entrada-do-prototipo, item 2). O banco recebe só o hash.
  const codigo = generateInviteCode()

  const { data: invitationId, error } = await client.rpc("create_family_invitation", {
    p_code_hash: byteaDigestParam(inviteCodeHash(codigo)),
    p_inviter_user_id: userId,
    p_token_digest: byteaDigestParam(tokenDigest),
    // O digest precisa do MESMO formato do token: sem o prefixo \x o PostgREST
    // entrega 64 bytes e o CHECK octet_length = 32 derruba o insert — medido em
    // runtime em 15/09/2026. Ver lib/invites-bytea.ts.
    p_invitee_email_digest: byteaDigestParam(inviteEmailDigest(normalizado)),
    p_invitee_email_hint: emailHint(normalizado),
  })

  if (error) {
    if (error.message.includes("maximum 5")) {
      throw new FalhaDeConvite(
        "teto-de-convites",
        "Máximo de 5 convites ativos. Revogue um antes de enviar outro.",
      )
    }
    throw new FalhaDeConvite("banco", "Não foi possível criar o convite agora.")
  }

  // O link precisa chegar ao familiar: enfileirar é o contrato, o adaptador de
  // e-mail entrega. O endereço cru só vive na coluna `recipient` do outbox.
  const { error: outboxError } = await client.from("outbox").insert({
    recipient: normalizado,
    channel: "email",
    type: "family_invite",
    payload: { user_id: userId, invitation_id: invitationId, invite_code: codigo },
  })
  if (outboxError) throw new FalhaDeConvite("banco", "Não foi possível enfileirar o convite.")

  const { pendentes } = await lerFamilia(client, userId)
  const convite = pendentes.find((linha) => linha.id === invitationId)
  if (convite === undefined) {
    throw new FalhaDeConvite("banco", "O convite foi criado, mas não voltou na lista.")
  }
  return { convite, codigo, token: token.toString("hex") }
}

/** Revoga um convite pendente do próprio titular; convite alheio não existe. */
export async function revogarConvite(
  client: Cliente,
  userId: string,
  invitationId: string,
): Promise<void> {
  const { error } = await client.rpc("revoke_family_invitation", {
    p_invitation_id: invitationId,
    p_inviter_user_id: userId,
  })
  if (error) {
    if (error.message.includes("not found or not revocable")) {
      throw new FalhaDeConvite(
        "convite-nao-encontrado",
        "Convite não encontrado ou já não pode ser revogado.",
      )
    }
    throw new FalhaDeConvite("banco", "Não foi possível revogar o convite agora.")
  }
}
