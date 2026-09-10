import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { createServerClient as createServiceClient } from "../../lib/supabase/server"
import { OperatorShell } from "../components/shell/operator-shell"

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()

  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // Layout is read-only; cookie writes happen in Server Actions / route
        // handlers that mutate session, never here.
      },
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    redirect("/login?return=/reports")
  }

  const serviceClient = createServiceClient()
  const { data: isOperator } = await serviceClient.rpc("is_current_user_operator", {
    p_user_id: user.id,
  })

  if (!isOperator) {
    redirect("/community")
  }

  // O cabeçalho das pranchas 57/58 mostra cidade, sino e identificação — os
  // mesmos dados do shell do membro, resolvidos por consulta real, nunca por
  // texto chumbado. Sem linha de localidade, o seletor de cidade simplesmente
  // não aparece; não se inventa cidade.
  const [{ data: membership }, { data: profile }] = await Promise.all([
    authClient
      .from("locality_memberships")
      .select("localities(city_name, state_code)")
      .eq("user_id", user.id)
      .eq("kind", "current")
      .maybeSingle(),
    authClient.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
  ])
  const locality = (
    membership as { localities: { city_name: string; state_code: string } | null } | null
  )?.localities
  const displayName =
    (profile as { display_name: string | null } | null)?.display_name || "Operação"

  return (
    <OperatorShell
      displayName={displayName}
      cityLabel={locality ? `${locality.city_name}, ${locality.state_code}` : null}
    >
      {children}
    </OperatorShell>
  )
}
