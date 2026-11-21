"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"
import {
  aceitarConviteDePrestador,
  TOKEN_DO_CONVITE,
} from "../../../../lib/providers/convite-prestador"

export type ProviderInvitationAcceptanceResult = { ok: true } | { ok: false; message: string }

const MENSAGENS: Readonly<Record<string, string>> = {
  "convite-nao-encontrado": "Este convite não foi encontrado.",
  "convite-expirado": "Este convite expirou.",
  "convite-usado": "Este convite já foi usado.",
  "conta-recusada": "Esta conta não pode aceitar o convite de prestador.",
  "outro-email": "O convite não corresponde ao seu e-mail.",
  indisponivel: "Não foi possível aceitar o convite. Tente novamente.",
}

export async function acceptProviderInvitationAction(
  token: string,
): Promise<ProviderInvitationAcceptanceResult> {
  if (!TOKEN_DO_CONVITE.test(token)) {
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

  const resultado = await aceitarConviteDePrestador(supabase, token, user.email)
  return resultado.ok ? { ok: true } : { ok: false, message: MENSAGENS[resultado.motivo] ?? "" }
}
