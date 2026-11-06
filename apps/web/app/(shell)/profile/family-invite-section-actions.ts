"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { generateInviteCode, inviteCodeHash } from "../../../lib/convite/digest"
import { enviarConvite, lerFamilia, revogarConvite } from "../../../lib/convite/familia"
import { byteaDigestParam } from "../../../lib/invites-bytea"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

// As regras de família vivem em `lib/convite/familia.ts`, chamadas daqui e de
// `/api/app/voce/familia` (RUN-018): um módulo, duas portas. Este arquivo só
// resolve a sessão do cookie e revalida as páginas antigas.

type PendingInviteRow = {
  id: string
  invitee_email_hint: string | null
  created_at: string
  expires_at: string
}

type FamilyInviteData = {
  isVerified: boolean
  pending: PendingInviteRow[]
}

async function readSessionUserId(): Promise<string | null> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }
  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
  const {
    data: { user },
  } = await authClient.auth.getUser()
  return user?.id ?? null
}

export async function getFamilyInviteDataAction(): Promise<FamilyInviteData | null> {
  const userId = await readSessionUserId()
  if (!userId) return null

  const familia = await lerFamilia(createServiceClient(), userId)
  return {
    isVerified: familia.podeConvidar,
    pending: familia.pendentes.map((convite) => ({
      id: convite.id,
      invitee_email_hint: convite.emailMascarado,
      created_at: convite.criadoEm,
      expires_at: convite.expiraEm,
    })),
  }
}

export async function sendFamilyInviteAction(
  formData: FormData,
): Promise<{ code: string; token: string } | undefined> {
  const userId = await readSessionUserId()
  if (!userId) throw new Error("não autenticado")

  // O e-mail é validado no módulo, que é o mesmo que a rota do app usa.
  const { codigo, token } = await enviarConvite(
    createServiceClient(),
    userId,
    formData.get("email"),
  )

  revalidatePath("/profile")

  // The token is shown exactly once, right here: it is not persisted, logged,
  // or sent in navigation. The digest is the only stored form (20260815130000).
  return { code: codigo, token }
}

export async function revokeFamilyInviteAction(formData: FormData) {
  const invitationId = formData.get("invitationId")
  if (typeof invitationId !== "string" || invitationId.length === 0) {
    throw new Error("invitationId required")
  }

  const userId = await readSessionUserId()
  if (!userId) throw new Error("não autenticado")

  await revogarConvite(createServiceClient(), userId, invitationId)

  revalidatePath("/profile")
  revalidatePath("/configuracoes/familia")
}
// Reenviar (prancha 76): o token em claro existe uma vez só, então reenviar é
// REEMITIR. O banco não guarda o e-mail — quem reenvia informa o endereço de
// novo e a função só aceita se o digest bater com o do convite. O link antigo
// deixa de valer no mesmo instante.
export async function resendFamilyInviteAction(
  formData: FormData,
): Promise<{ code: string; token: string } | undefined> {
  const invitationId = formData.get("invitationId")
  const email = formData.get("email")
  if (typeof invitationId !== "string" || invitationId.length === 0) {
    throw new Error("Convite não identificado.")
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Informe o mesmo e-mail que recebeu o convite.")
  }

  const userId = await readSessionUserId()
  if (!userId) throw new Error("não autenticado")

  const { createHash, randomBytes } = await import("node:crypto")
  const token = randomBytes(32)
  const tokenDigest = createHash("sha256").update(token).digest("hex")
  const normalizedEmail = email.trim().toLowerCase()
  const emailDigest = createHash("sha256").update(normalizedEmail).digest("hex")
  // Reemitir gira o código junto com o token: o código antigo morre aqui.
  const code = generateInviteCode()

  const supabase = createServiceClient()
  const { error } = await supabase.rpc("resend_family_invitation", {
    p_code_hash: byteaDigestParam(inviteCodeHash(code)),
    p_invitation_id: invitationId,
    p_inviter_user_id: userId,
    p_token_digest: byteaDigestParam(tokenDigest),
    p_invitee_email_digest: byteaDigestParam(emailDigest),
  })

  if (error) {
    if (error.message.includes("not found or not resendable")) {
      throw new Error("Confira se este é o mesmo e-mail do convite e se ele ainda está pendente.")
    }
    throw new Error(error.message)
  }

  // O endereço cru só vive na coluna recipient do outbox, como no envio.
  const { error: outboxError } = await supabase.from("outbox").insert({
    recipient: normalizedEmail,
    channel: "email",
    type: "family_invite",
    payload: {
      user_id: userId,
      invitation_id: invitationId,
      invite_code: code,
      resent: true,
    },
  })

  if (outboxError) {
    throw new Error(`Falha ao enfileirar o reenvio: ${outboxError.message}`)
  }

  revalidatePath("/profile")
  revalidatePath("/configuracoes/familia")

  // Mesma regra do envio: o token (e agora o código) aparece uma vez, aqui.
  return { code, token: token.toString("hex") }
}
