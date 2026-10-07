import { createServerClient as createSsrClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"

// FIGMA-002 — client de servidor COM a sessão do membro (cookies), o mesmo
// padrão do layout do prestador: ações e leituras server-side carregam o JWT
// real do caller, então RLS e policies de storage decidem como no browser.
// service_role continua reservado a caminhos privilegiados explícitos
// (apps/web/AGENTS.md: service_role é privilégio, não identidade do caller).

export async function createUserClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()

  return createSsrClient<Database>(url, anonKey, {
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        // Server Actions podem refrescar a sessão: escreve de volta os cookies
        // que o ssr pedir (mesmo contrato do shell do membro).
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options)
        }
      },
    },
  })
}
