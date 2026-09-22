import { Checkbox } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import type { Route } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"
import { saveAttendanceAction } from "../actions"

export default async function PrestadorAtendimentoPage() {
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
      setAll() {},
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) return null

  const { data: profileRow } = await authClient
    .from("provider_profiles")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle()
  const profileId = (profileRow as { id: string } | null)?.id ?? null

  const serviceClient = createServiceClient()
  const { data: accountRow } = await serviceClient
    .from("provider_accounts")
    .select("community_id, locality_id")
    .eq("auth_user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle()
  const account = (accountRow ?? null) as {
    community_id: string
    locality_id: string | null
  } | null

  let communityName = "sua comunidade"
  if (account?.community_id) {
    const { data: communityRow } = await serviceClient
      .from("communities")
      .select("name")
      .eq("id", account.community_id)
      .maybeSingle()
    communityName = (communityRow as { name: string } | null)?.name ?? communityName
  }

  let cityLabel = ""
  if (account?.locality_id) {
    const { data: localityRow } = await serviceClient
      .from("localities")
      .select("city_name, state_code")
      .eq("id", account.locality_id)
      .maybeSingle()
    const locality = localityRow as { city_name: string; state_code: string } | null
    if (locality) cityLabel = `${locality.city_name}, ${locality.state_code}`
  }

  let reachActive = false
  if (profileId) {
    const { data: reachRow } = await authClient
      .from("provider_reach")
      .select("active")
      .eq("provider_id", profileId)
      .eq("scope_type", "community")
      .eq("source", "free")
      .maybeSingle()
    reachActive = (reachRow as { active: boolean } | null)?.active ?? false
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Área de atendimento</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Defina para quem a sua ficha aparece. Esta é a região atendida hoje:{" "}
        <strong>{cityLabel || "não definida"}</strong>.
      </p>

      {profileId ? (
        <form action={saveAttendanceAction} className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-[var(--semantic-surface)] p-4">
            <Checkbox name="active" defaultSelected={reachActive}>
              Atender membros de {communityName}
            </Checkbox>
            <p className="mt-2 text-sm text-muted">
              Com o alcance ligado, a ficha aparece para os membros aprovados desta comunidade. Com
              ele desligado, a ficha sai da busca — pedidos existentes continuam no histórico.
            </p>
          </div>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-lg bg-[var(--semantic-action-primary)] px-5 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors"
          >
            Salvar área de atendimento
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-muted">
          Crie sua ficha antes de definir a área de atendimento.{" "}
          <Link href={"/prestador/ficha" as Route} className="underline">
            Ir para Minha ficha
          </Link>
        </p>
      )}
    </div>
  )
}
