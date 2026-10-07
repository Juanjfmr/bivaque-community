"use server"

import { revalidatePath } from "next/cache"
import { createUserClient } from "./server"

// FIGMA-002 — Salvar anúncio (ADR-20261006, seção "Salvos privados").
//
// A relação é privada do membro e o caminho normal do produto NUNCA usa
// service_role: quem salva é o caller do JWT de sessão, e a RLS de
// public.listing_saves decide se o anúncio é active, não ocultado e de público
// alcançado. Repetir a mesma ação é inofensivo (upsert com on conflict / delete
// sem correspondência), então o botão nunca precisa de um guarda no cliente
// para não duplicar estado.
//
// Consequências que a tela respeita e o banco garante:
//   * salvar NÃO publica, não reativa e não amplia o público do anúncio;
//   * só o próprio save é lido/alterado, e DELETE continua possível mesmo sem
//     acesso ao anúncio (o caso de quem perdeu a audiência);
//   * a permissão de quem salva o próprio anúncio é a MESMA regra comum — não
//     existe caminho paralelo para o dono.

export interface SaveActionResult {
  ok: boolean
  error: string | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function saveListing(form: FormData): Promise<SaveActionResult> {
  const listingId = form.get("listing_id")
  if (typeof listingId !== "string" || !UUID.test(listingId)) {
    return { ok: false, error: "Anúncio não informado." }
  }
  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Entre para salvar este anúncio." }

  const { data, error } = await supabase
    .from("listing_saves")
    .upsert(
      { user_id: user.id, listing_id: listingId },
      { onConflict: "user_id,listing_id", ignoreDuplicates: true },
    )
    .select("listing_id")
    .maybeSingle()

  if (error || !data) {
    // RLS recusou (não active, ocultado ou fora do público), a sessão expirou ou
    // o banco está fora: a tela recebe uma negativa honesta, nunca um falso
    // "salvo" que o reload desmente.
    if (error?.code === "42501" || error?.code === "PGRST301") {
      return { ok: false, error: "Este anúncio não está disponível para salvar agora." }
    }
    return { ok: false, error: "Não foi possível salvar o anúncio agora. Tente novamente." }
  }

  revalidatePath(`/imoveis/${listingId}`)
  revalidatePath("/imoveis")
  revalidatePath("/imoveis/salvos")
  return { ok: true, error: null }
}

export async function unsaveListing(form: FormData): Promise<SaveActionResult> {
  const listingId = form.get("listing_id")
  if (typeof listingId !== "string" || !UUID.test(listingId)) {
    return { ok: false, error: "Anúncio não informado." }
  }
  const supabase = await createUserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Entre para gerenciar seus anúncios salvos." }

  const { error } = await supabase
    .from("listing_saves")
    .delete()
    .eq("user_id", user.id)
    .eq("listing_id", listingId)

  if (error) {
    return { ok: false, error: "Não foi possível remover dos salvos agora. Tente novamente." }
  }

  revalidatePath(`/imoveis/${listingId}`)
  revalidatePath("/imoveis")
  revalidatePath("/imoveis/salvos")
  return { ok: true, error: null }
}
