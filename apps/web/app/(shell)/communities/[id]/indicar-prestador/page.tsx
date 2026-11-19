import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { Card } from "../../../../components/bivaque/card"
import { FeedbackAlert } from "../../../../components/bivaque/feedback-alert"
import { ProviderInvitationForm } from "./invite-form"

export default async function ProviderInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: communityId } = await params
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
  if (!user) redirect(`/login?next=/communities/${communityId}/indicar-prestador`)

  const { data: community, error } = await supabase
    .from("communities")
    .select("id, name")
    .eq("id", communityId)
    .eq("is_deleted", false)
    .maybeSingle()
  if (error) throw new Error(`Falha ao ler a comunidade: ${error.message}`)
  if (!community) notFound()

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-6 pb-8">
      <header className="space-y-1">
        <p className="text-sm font-medium text-accent-strong">{community.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Indicar prestador</h1>
        <p className="text-sm text-muted">
          Indique alguém em quem a comunidade pode confiar. O convite expira em sete dias.
        </p>
      </header>

      <FeedbackAlert
        variant="info"
        title="Acesso restrito do prestador"
        description="Ele vê somente a própria ficha e as conversas que membros iniciarem. Não vê feed, perfis, grupos, eventos, comunidades nem listas de membros. Dentro da conversa, verá apenas o nome de exibição de quem falou com ele."
      />

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-base font-semibold tracking-tight">Convidar prestador</h2>
        <ProviderInvitationForm communityId={communityId} />
        <Link
          href={`/communities/${communityId}`}
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-selected)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
        >
          Cancelar
        </Link>
      </Card>
    </div>
  )
}
