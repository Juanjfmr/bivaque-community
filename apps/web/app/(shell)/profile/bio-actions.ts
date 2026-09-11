"use server"

// Escrita da bio (D1–D4). A RPC `set_profile_bio` roda como o chamador
// (SECURITY INVOKER), então a policy `profiles_update_self` é quem autoriza:
// a sessão só grava a própria linha. Esvaziar grava NULL — apagar apaga (D3).
//
// O cliente é o da SESSÃO (cookies + anon key), nunca o service_role: sob
// service_role `auth.uid()` não é a pessoa e a RLS seria burlada. O erro do
// banco é tratado como erro recuperável — nunca vira sucesso silencioso.

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { normalizeBio, validateBio } from "../../../lib/profile/bio"
import { callProfileBioRpc } from "../../../lib/profile/profile-bio-rpcs"

async function readSessionClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }
  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
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
  if (!user) return null
  return supabase
}

// O texto cru do Postgres não é mensagem de pessoa. Código conhecido vira copy
// recuperável; desconhecido vira a genérica. Em nenhum caso o erro some.
function bioErrorMessage(error: { code?: string }): string {
  if (error.code === "23514") {
    return "A apresentação contém algo que não podemos publicar. Revise o texto e tente novamente."
  }
  if (error.code === "42501") {
    return "Sua sessão expirou. Entre novamente para continuar."
  }
  if (error.code === "P0002") {
    return "Não encontramos seu perfil para salvar. Recarregue a página e tente novamente."
  }
  return "Não foi possível salvar a apresentação. Tente novamente."
}

export async function saveBioAction(rawBio: string): Promise<void> {
  const issue = validateBio(rawBio)
  if (issue) {
    throw new Error(issue)
  }

  const supabase = await readSessionClient()
  if (!supabase) {
    throw new Error("Sua sessão expirou. Entre novamente para continuar.")
  }

  const { error } = await callProfileBioRpc(supabase, "set_profile_bio", {
    p_bio: normalizeBio(rawBio),
  })
  if (error) {
    throw new Error(bioErrorMessage(error))
  }

  revalidatePath("/profile")
}
