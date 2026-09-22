import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { EventForm } from "../event-form"

// RECON-029 (R35): rota de criação. O evento é persistido antes de ser
// divulgado; a lista de eventos passa a encontrá-lo. A autorização de escrita é
// da RLS (`events_insert_verified_member`), não desta página.
export default async function NewEventPage() {
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
    redirect("/login?return=/events/novo")
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
      <EventForm mode="create" initial={{ title: "", description: "", startsAt: "", venue: "" }} />
    </div>
  )
}
