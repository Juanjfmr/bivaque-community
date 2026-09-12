import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { createServerClient as createServiceClient } from "../../lib/supabase/server"
import { ProviderShell } from "./provider-shell"

// Shell próprio do prestador (prancha 23; ADR-20260820, D36/D37). O middleware
// já roteia a conta de prestador para /prestador; este layout reconfere o papel
// e resolve a identidade do NEGÓCIO para o cabeçalho e a barra lateral.
export default async function ProviderLayout({ children }: Readonly<{ children: ReactNode }>) {
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
    redirect("/login?return=/prestador")
  }

  // service_role is privilege, not caller identity — pass the real user id
  // (apps/web/AGENTS.md server/client trust boundary). is_provider_account is
  // service_role-only (migration 20260822014934_provider_accounts.sql).
  const serviceClient = createServiceClient()
  const { data: isProvider } = await serviceClient.rpc("is_provider_account", {
    p_user_id: user.id,
  })

  if (!isProvider) {
    redirect("/community")
  }

  // A ficha é visível ao dono pela RLS owner-only — leitura com o cliente
  // autenticado é a prova de que o prestador vê a própria ficha.
  const { data: profileRow } = await authClient
    .from("provider_profiles")
    .select("display_name, category")
    .eq("owner_user_id", user.id)
    .maybeSingle()

  const profile = (profileRow ?? null) as {
    display_name: string
    category: ProviderCategory
  } | null

  const categoryLabel = profile ? PROVIDER_CATEGORY_LABELS[profile.category] : "Meu negócio"
  const businessName = profile?.display_name?.trim() || "Meu negócio"

  return (
    <ProviderShell businessName={businessName} categoryLabel={categoryLabel}>
      {children}
    </ProviderShell>
  )
}
