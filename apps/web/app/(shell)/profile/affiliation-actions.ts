"use server"

// Escrita de Força Armada e OM em `public.profile_affiliations` (D1–D3).
// Uma linha por campo: valor presente → upsert com o is_visible do toggle;
// campo limpo → DELETE da linha (é o apagar de verdade da D3). Ocultar não
// apaga: é upsert com is_visible = false, a linha continua lá para o dono.
//
// O cliente é o da SESSÃO (Cookies + anon key), nunca o service_role: as
// políticas insert/update/delete_self exigem user_id = auth.uid(), e sob
// service_role a RLS é burlada e a fronteira de escrita do próprio perfil
// deixaria de existir. O user_id gravado é o da sessão resolvida no servidor
// — nada de identidade vinda do cliente.
//
// A validação do módulo `affiliation.ts` corre AQUI também, à direita da
// fronteira de confiança: o que a tela valida antes de chamar não prova nada
// sobre o que chega por outra via. E o erro do banco (check de `field`,
// check de valor por campo, RLS) é tratado como erro recuperável — nunca
// como sucesso silencioso nem como estado vazio.

import { createServerClient } from "@supabase/ssr"
import type { PostgrestError } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"
import {
  type AffiliationDraft,
  isArmedForceId,
  normalizeAffiliation,
  validateOm,
} from "./affiliation"

type AffiliationUpsert = Database["public"]["Tables"]["profile_affiliations"]["Insert"]
type AffiliationField = "armed_force" | "om"

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
  return { supabase, userId: user.id }
}

// O texto cru do Postgres (inglês, detalhe de constraint) não é mensagem de
// pessoa. Código conhecido vira copy recuperável; desconhecido vira a
// mensagem genérica. Em nenhum caso o erro some.
function affiliationErrorMessage(error: PostgrestError): string {
  if (error.code === "23514") {
    return "O servidor recusou um dos valores informados. Confira Força Armada e OM e tente novamente."
  }
  if (error.code === "42501") {
    return "Sua sessão expirou. Entre novamente para continuar."
  }
  return "Não foi possível salvar Força Armada ou OM. Tente novamente."
}

export async function saveAffiliationAction(draft: AffiliationDraft): Promise<void> {
  const normalized = normalizeAffiliation(draft)

  if (normalized.armedForce !== "" && !isArmedForceId(normalized.armedForce)) {
    throw new Error("A Força Armada informada não está na lista aprovada.")
  }
  const omIssue = validateOm(normalized.om)
  if (omIssue) {
    throw new Error(omIssue)
  }

  const session = await readSessionClient()
  if (!session) {
    throw new Error("Sua sessão expirou. Entre novamente para continuar.")
  }
  const { supabase, userId } = session
  const updatedAt = new Date().toISOString()

  const upserts: AffiliationUpsert[] = []
  const clearedFields: AffiliationField[] = []
  if (normalized.armedForce !== "") {
    upserts.push({
      user_id: userId,
      field: "armed_force",
      value: normalized.armedForce,
      is_visible: normalized.armedForceVisible,
      updated_at: updatedAt,
    })
  } else {
    clearedFields.push("armed_force")
  }
  if (normalized.om !== "") {
    upserts.push({
      user_id: userId,
      field: "om",
      value: normalized.om,
      is_visible: normalized.omVisible,
      updated_at: updatedAt,
    })
  } else {
    clearedFields.push("om")
  }

  if (upserts.length > 0) {
    const { error } = await supabase
      .from("profile_affiliations")
      .upsert(upserts, { onConflict: "user_id,field" })
    if (error) throw new Error(affiliationErrorMessage(error))
  }
  if (clearedFields.length > 0) {
    const { error } = await supabase
      .from("profile_affiliations")
      .delete()
      .eq("user_id", userId)
      .in("field", clearedFields)
    if (error) throw new Error(affiliationErrorMessage(error))
  }

  revalidatePath("/profile")
}
