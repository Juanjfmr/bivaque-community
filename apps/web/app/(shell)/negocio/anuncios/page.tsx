import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { ownBusinessDetails } from "../../../../lib/providers/business-data"
import { ButtonLink } from "../../../components/ui/button"
import { Panel } from "../../../components/ui/panel"
import { ListingLinks } from "./listing-links"

export default async function BusinessListingsPage() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"],
    key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !key) throw new Error("Supabase web environment is required")
  const cookieStore = await cookies()
  const client = createServerClient(url, key, {
    cookies: { getAll: () => cookieStore.getAll(), setAll() {} },
  })
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile, error } = await client
    .from("provider_profiles")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle()
  if (error) throw new Error("Não foi possível carregar o negócio.")
  if (!profile) redirect("/negocio")
  const { data: reach, error: reachError } = await client
    .from("provider_reach")
    .select("scope_id")
    .eq("provider_id", profile.id)
    .eq("scope_type", "locality")
    .eq("active", true)
  if (reachError) throw new Error("Não foi possível carregar o alcance do negócio.")
  const localityIds = (reach ?? []).map((row) => row.scope_id)
  const { data: listings, error: listingError } = localityIds.length
    ? await client
        .from("listings")
        .select("id,title,status,provider_id")
        .eq("owner_user_id", user.id)
        .eq("kind", "item")
        .in("locality_id", localityIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null }
  if (listingError) throw new Error("Não foi possível carregar os anúncios.")
  const details = await ownBusinessDetails(client, profile.id)
  return (
    <div className="mx-auto w-full max-w-[72rem] space-y-5 px-4 pt-5 pb-8 lg:px-8">
      <ButtonLink href="/negocio" variant="ghost">
        Voltar ao negócio
      </ButtonLink>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ui-ink">Anúncios do negócio</h1>
        <p className="mt-2 max-w-prose text-sm text-ui-ink-2">
          Escolha quais produtos pertencem à sua página. Só anúncios ativos aparecem para outros
          membros; seus anúncios pessoais continuam separados.
        </p>
      </header>
      <Panel
        title="Seus anúncios nesta cidade"
        titleId="business-linkable-title"
        bodyClassName="p-5"
      >
        <ListingLinks
          listings={listings ?? []}
          providerId={profile.id}
          canLink={details !== null}
        />
      </Panel>
    </div>
  )
}
