"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"

export type ProviderInvitationActionResult = { ok: true } | { ok: false; message: string }

async function getAuthClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
}

function formString(formData: FormData, name: string): string | null {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : null
}

export async function createProviderInvitationAction(
  communityId: string,
  formData: FormData,
): Promise<ProviderInvitationActionResult> {
  const email = formString(formData, "email")
  const displayName = formString(formData, "displayName")
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Informe um e-mail válido." }
  }
  if (!displayName || displayName.length < 2 || displayName.length > 80) {
    return { ok: false, message: "O nome deve ter entre 2 e 80 caracteres." }
  }

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, message: "Sua sessão expirou. Entre novamente para indicar." }
  }

  const { error } = await supabase.rpc("create_provider_invitation", {
    p_community_id: communityId,
    p_email: email,
    p_display_name: displayName,
  })
  if (error) {
    if (error.code === "42501") {
      return { ok: false, message: "Só membros aprovados desta comunidade podem indicar." }
    }
    if (error.code === "54000") {
      return { ok: false, message: "Você já tem cinco convites ativos. Aguarde um aceite." }
    }
    return { ok: false, message: "Não foi possível enviar o convite. Tente novamente." }
  }

  return { ok: true }
}
