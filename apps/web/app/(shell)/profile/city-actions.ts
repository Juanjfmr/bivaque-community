"use server"

// Mudar a cidade pelo perfil (25/09/2026). Chama `declare_locality_transfer`
// com o cliente da SESSÃO: a função é SECURITY DEFINER e usa auth.uid(), então
// quem muda é sempre quem está logado — nunca um id vindo do formulário. A
// cidade de destino e o prazo são validados aqui antes do banco, e o banco
// valida de novo (destino no catálogo, diferente da atual, uma saída por vez).

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"
import { moveErrorMessage, validateMove } from "../../../lib/locality/move-city"
import { log } from "../../../lib/logger"

export type MoveCityResult = { ok: true; cityName: string } | { ok: false; message: string }

async function sessionClient() {
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

export async function moveCityAction(
  destinationId: string,
  termDate: string,
): Promise<MoveCityResult> {
  const supabase = await sessionClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Sua sessão expirou. Entre novamente para continuar." }

  const { data: currentRow, error: currentError } = await supabase
    .from("locality_memberships")
    .select("locality_id")
    .eq("kind", "current")
    .maybeSingle()
  if (currentError || currentRow === null) {
    log.error("profile: could not resolve the current locality before moving", {
      user_id: user.id,
      error: currentError?.message ?? "no current membership",
    })
    return { ok: false, message: moveErrorMessage({}) }
  }

  const invalid = validateMove(
    { destinationId, currentId: currentRow.locality_id, termDate },
    new Date(),
  )
  if (invalid) return { ok: false, message: invalid }

  const { error } = await supabase.rpc("declare_locality_transfer", {
    p_destination_locality_id: destinationId,
    p_term_date: termDate,
  })
  if (error) {
    log.error("profile: declare_locality_transfer failed", {
      user_id: user.id,
      code: error.code,
      error: error.message,
    })
    return { ok: false, message: moveErrorMessage(error) }
  }

  const { data: city } = await supabase
    .from("localities")
    .select("city_name")
    .eq("id", destinationId)
    .maybeSingle()

  // A cidade é resolvida pelo layout do shell: tudo embaixo dele muda.
  revalidatePath("/", "layout")
  return { ok: true, cityName: city?.city_name ?? "a nova cidade" }
}
