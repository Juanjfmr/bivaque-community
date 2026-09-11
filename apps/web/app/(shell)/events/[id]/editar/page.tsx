import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { EventForm } from "../../event-form"

type EventRow = Database["public"]["Tables"]["events"]["Row"]

function toLocalInputValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

// RECON-029 (R35): rota de edição. Só o organizador edita (RLS
// `events_update_organizer`); quem não organiza recebe 404 — nunca uma tela que
// confirme a existência de algo que não pode gerenciar. O alcance não é editável
// aqui: não há campo de cidade, comunidade ou grupo no formulário.
export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient<Database>(url, anonKey, {
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
  if (!user) {
    redirect(`/login?return=/events/${eventId}/editar`)
  }

  const { data: eventData, error } = await authClient
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle()
  if (error) throw new Error(`failed to read event: ${error.message}`)
  const event = eventData as EventRow | null
  if (!event || event.organizer_id !== user.id) notFound()

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <EventForm
        mode="edit"
        cancelled={event.status === "cancelled"}
        initial={{
          id: event.id,
          title: event.title,
          description: event.description ?? "",
          startsAt: toLocalInputValue(event.starts_at),
          venue: event.venue ?? "",
        }}
      />
    </div>
  )
}
