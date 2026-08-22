import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

// Onda G — Task 1, Step 4: a página do prestador é honesta e mínima.
// A ficha (identidade + catálogo + portfólio) entra na Task 3.
//
// Regra 4 da §12: UI só mostra affordance se o fluxo fecha hoje. O
// prestador não pode criar ficha nesta task — o convite vem na Task 2 e
// a ficha em si na Task 3 — então esta página não tem botão de "criar
// ficha". O que ela mostra é só o vínculo: quem indicou e em qual
// comunidade, para o prestador não achar que a página quebrou.

export default async function PrestadorHomePage() {
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
        // Read-only here.
      },
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) {
    return null
  }

  // service_role is privilege, not caller identity — pass the real user
  // id explicitly (apps/web/AGENTS.md server/client trust boundary).
  const serviceClient = createServiceClient()
  const { data: row } = await serviceClient
    .from("provider_accounts")
    .select("community_id, locality_id, created_at")
    .eq("auth_user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle()

  if (!row) {
    return null
  }

  // Fetching the community display name still goes through RLS — the
  // provider account is allowed to see the community it was attached to
  // because it carries the community_id FK (the same auth pattern used
  // elsewhere when a non-member account must reference a single row).
  // The RLS policy for `communities_select_locality_member` denies the
  // provider, so we read the name as service_role only for this header.
  const { data: community } = await serviceClient
    .from("communities")
    .select("name")
    .eq("id", row.community_id)
    .maybeSingle()

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Painel do prestador</h1>
      <p className="mt-2 text-muted-foreground">
        Você foi indicado pela comunidade <strong>{community?.name ?? "desconhecida"}</strong>.
      </p>

      <section
        aria-label="Próximos passos"
        className="mt-8 rounded-lg border border-border bg-surface p-5"
      >
        <h2 className="text-lg font-medium">Próximos passos</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua ficha de vitrine entra na próxima fase da onda G. Por enquanto este painel existe para
          garantir que o roteamento da sua conta está correto — você está dentro do shell do
          prestador, sem acesso a feed, perfil ou grupos de membros.
        </p>
      </section>
    </main>
  )
}
