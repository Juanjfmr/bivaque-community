"use server"

// RECON-029 (R35): criar e editar evento persistem antes de divulgar.
//
// A autorização é da RLS (`events_insert_verified_member`,
// `events_update_organizer`), não desta camada. A edição NÃO toca em
// localidade/comunidade/grupo: o alcance original é preservado, como a cláusula
// R35 exige. Alterar ou cancelar aciona `notify_event_change`, que avisa quem
// confirmou presença conforme as preferências.

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"
import {
  buildEventCreatePayload,
  buildEventPayload,
  type EventFormInput,
  validateEventForm,
} from "../../../lib/events/event-form"

export type EventFormResult = { ok: true; eventId: string } | { ok: false; message: string }

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

function readInput(formData: FormData): EventFormInput {
  return {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    venue: String(formData.get("venue") ?? ""),
  }
}

export async function createEventAction(formData: FormData): Promise<EventFormResult> {
  const input = readInput(formData)
  const validationError = validateEventForm(input)
  if (validationError) return { ok: false, message: validationError }

  const localityId = String(formData.get("localityId") ?? "")
  if (!localityId) return { ok: false, message: "Selecione a cidade do evento." }

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Sua sessão expirou. Entre novamente." }

  const payload = buildEventCreatePayload(input, {
    organizerId: user.id,
    localityId,
  })

  const { data, error } = await supabase
    .from("events")
    .insert(payload as never)
    .select("id")
    .single()
  if (error || !data) {
    return {
      ok: false,
      message:
        "Não foi possível criar o evento. Confirme que você é membro verificado desta cidade e tente novamente.",
    }
  }

  revalidatePath("/events")
  return { ok: true, eventId: (data as { id: string }).id }
}

export async function updateEventAction(formData: FormData): Promise<EventFormResult> {
  const eventId = String(formData.get("eventId") ?? "")
  if (!eventId) return { ok: false, message: "Evento inválido." }

  const input = readInput(formData)
  const validationError = validateEventForm(input)
  if (validationError) return { ok: false, message: validationError }

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Sua sessão expirou. Entre novamente." }

  // `buildEventPayload` carrega só os campos editáveis — sem localidade, sem
  // comunidade, sem grupo. O alcance original não é contornável pela edição.
  const { error } = await supabase
    .from("events")
    .update(buildEventPayload(input) as never)
    .eq("id", eventId)
    .eq("organizer_id", user.id)
  if (error) {
    return {
      ok: false,
      message: "Não foi possível salvar as alterações. Tente novamente.",
    }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath("/events")
  return { ok: true, eventId }
}

export async function cancelEventAction(formData: FormData): Promise<EventFormResult> {
  const eventId = String(formData.get("eventId") ?? "")
  if (!eventId) return { ok: false, message: "Evento inválido." }

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Sua sessão expirou. Entre novamente." }

  // `notify_event_change` percebe a mudança de situação e avisa quem confirmou.
  const { error } = await supabase
    .from("events")
    .update({ status: "cancelled" } as never)
    .eq("id", eventId)
    .eq("organizer_id", user.id)
  if (error) return { ok: false, message: "Não foi possível cancelar o evento. Tente novamente." }

  revalidatePath(`/events/${eventId}`)
  revalidatePath("/events")
  return { ok: true, eventId }
}
