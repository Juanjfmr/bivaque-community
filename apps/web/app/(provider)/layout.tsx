import { createServerClient } from "@supabase/ssr"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { createServerClient as createServiceClient } from "../../lib/supabase/server"
import { ToastProvider } from "../components/bivaque/toast"
import { ProviderNavigation } from "./provider-navigation"

export default async function ProviderLayout({ children }: Readonly<{ children: ReactNode }>) {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const { cookies } = await import("next/headers")
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
  // (apps/web/AGENTS.md server/client trust boundary; supabase/AGENTS.md
  // Bivaque-specific authorization trap). is_provider_account is
  // service_role-only (see migration 20260822014934_provider_accounts.sql).
  const serviceClient = createServiceClient()
  const { data: isProvider } = await serviceClient.rpc("is_provider_account", {
    p_user_id: user.id,
  })

  if (!isProvider) {
    // Member that wandered into the provider shell — send home. The
    // middleware already routes providers here, so reaching this branch
    // means a stale cookie or a manual URL; either way, /community is the
    // correct destination for any member.
    redirect("/community")
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* FIGMA-001 (reparos finais 06/10/2026): a nav vira componente cliente —
          exatamente um aria-current por pathname (o thread /prestador/conversas/<id>
          ativa Conversas) e estados active/focus/hover visíveis a 120ms com
          reduced motion. A caixa real do prestador continua no próprio shell
          (delta provider 06/10/2026): /messages é rota do membro e o proxy
          devolve o prestador para o painel. */}
      <ProviderNavigation />
      {/* O detalhe de conversa compartilhado chama showToast (bloquear/
          desbloquear, falhas de envio); sem a região montada os toasts caem
          em silêncio — a mesma armadilha documentada no shell do membro. */}
      <ToastProvider>{children}</ToastProvider>
    </div>
  )
}
