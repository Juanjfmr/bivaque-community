import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"

// Cliente na identidade do membro (cookie de sessao), nunca service_role:
// e a RLS de `reports` (select do proprio denunciante) e de `dm_blocks` que
// decide o que estas telas podem mostrar.

export async function createAuthedClient() {
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
        // Componentes de servidor deste modulo nao escrevem cookie.
      },
    },
  })
}
