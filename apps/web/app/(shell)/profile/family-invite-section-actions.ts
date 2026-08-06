"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

export async function sendFamilyInviteAction(formData: FormData) {
  const email = formData.get("email")
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("email inválido")
  }

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
  if (!user) throw new Error("não autenticado")

  const supabase = createServiceClient()
  const { data: isVerified } = await supabase.rpc("is_verified_holder", {
    p_user_id: user.id,
  })
  if (!isVerified) {
    throw new Error("apenas titulares verificados podem enviar convites")
  }

  const { createHash, randomBytes } = await import("node:crypto")
  const token = randomBytes(32)
  const tokenDigest = createHash("sha256").update(token).digest("hex")
  const emailDigest = createHash("sha256").update(email.toLowerCase().trim()).digest("hex")

  const { error } = await supabase.rpc("create_family_invitation", {
    p_inviter_user_id: user.id,
    p_token_digest: tokenDigest,
    p_invitee_email_digest: emailDigest,
  })

  if (error) {
    if (error.message.includes("maximum 5")) {
      throw new Error("máximo de 5 convites ativos. Revogue um antes de enviar outro.")
    }
    throw new Error(error.message)
  }

  revalidatePath("/profile")
}

export async function revokeFamilyInviteAction(formData: FormData) {
  const invitationId = formData.get("invitationId")
  if (typeof invitationId !== "string" || invitationId.length === 0) {
    throw new Error("invitationId required")
  }

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
  if (!user) throw new Error("não autenticado")

  const supabase = createServiceClient()
  const { error } = await supabase.rpc("revoke_family_invitation", {
    p_invitation_id: invitationId,
    p_inviter_user_id: user.id,
  })

  if (error) {
    if (error.message.includes("not found or not revocable")) {
      throw new Error("Convite não encontrado ou já não pode ser revogado.")
    }
    throw new Error(error.message)
  }

  revalidatePath("/profile")
}
