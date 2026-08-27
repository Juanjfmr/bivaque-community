"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"

export type ProviderInvitationAcceptanceResult = { ok: true } | { ok: false; message: string }

export async function acceptProviderInvitationAction(
  token: string,
): Promise<ProviderInvitationAcceptanceResult> {
  if (!/^[0-9a-fA-F]{64}$/.test(token)) {
    return { ok: false, message: "Este convite não foi encontrado." }
  }

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return { ok: false, message: "Confirme seu e-mail antes de aceitar o convite." }
  }

  const { error } = await supabase.rpc("accept_provider_invitation", {
    p_token: token,
    p_email: user.email,
  })
  if (error) {
    if (error.code === "P0004") return { ok: false, message: "Este convite expirou." }
    if (error.code === "P0003") return { ok: false, message: "Este convite já foi usado." }
    if (error.code === "42501") {
      return { ok: false, message: "Esta conta não pode aceitar o convite de prestador." }
    }
    if (error.code === "P0002") {
      return { ok: false, message: "O convite não corresponde ao seu e-mail." }
    }
    return { ok: false, message: "Não foi possível aceitar o convite. Tente novamente." }
  }

  return { ok: true }
}
