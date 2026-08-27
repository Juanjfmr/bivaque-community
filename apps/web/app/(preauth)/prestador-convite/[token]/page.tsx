import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"
import { Card } from "../../../components/bivaque/card"
import { ProviderInvitationAcceptance } from "./acceptance"

export default async function ProviderInvitationAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-4 py-10">
      <Card className="w-full space-y-5 p-6">
        <header className="space-y-2">
          <p className="text-sm font-medium text-accent-strong">Convite de prestador</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Ofereça seus serviços no Bivaque
          </h1>
          <p className="text-sm text-muted">
            Uma comunidade indicou você. Sua conta será civil e separada dos membros: ela não dá
            acesso a feed, perfis, grupos, eventos ou listas da comunidade.
          </p>
        </header>
        <ProviderInvitationAcceptance token={token} authenticatedEmail={user?.email ?? null} />
      </Card>
    </main>
  )
}
