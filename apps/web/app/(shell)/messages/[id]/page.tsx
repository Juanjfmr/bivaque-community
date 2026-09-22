import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { ConversationInbox } from "../conversation-inbox"

// URL estavel da conversa (spec C12): abrir /messages/<id> direto reconstroi o
// estado correto porque a participacao e conferida aqui, no servidor, pela RLS
// de `dm_conversations` (select apenas para participante). Conversa de outra
// pessoa e conversa inexistente respondem igual — 404 — para nao enumerar ids.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function createAuthedClient() {
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
      setAll() {
        // Server component, sem escrita de cookie.
      },
    },
  })
}

export default async function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_PATTERN.test(id)) {
    notFound()
  }

  const supabase = await createAuthedClient()
  const { data, error } = await supabase
    .from("dm_conversations")
    .select("id")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) {
    notFound()
  }

  return <ConversationInbox activeConversationId={id} />
}
