import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import { ArrowLeft, Building2, MapPin } from "lucide-react"
import type { Route } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import { log } from "../../../../lib/logger"
import { businessContent, publicBusinessDetails } from "../../../../lib/providers/business-data"
import { ButtonLink } from "../../../components/ui/button"
import { Eyebrow, Panel } from "../../../components/ui/panel"
import { BusinessContent } from "../../negocio/business-content"
import { ProviderActions } from "./provider-actions"

// RECON-022 — a ficha vista pelo membro, fiel à prancha 62.
//
// Leitura pelo CLIENTE AUTENTICADO: a RLS de `provider_profiles` via
// `private.can_see_provider` decide quem vê. Quem não pode ver recebe
// notFound() — o Next 16 responde 200 com a UI de não-encontrado, então a
// asserção externa é sobre conteúdo presente/ausente, nunca sobre status.
//
// A localização NÃO é inferida do desenho: ela sai do alcance real
// (`provider_reach` → comunidade/localidade). Quando o dado não existe, a
// linha some — omitir é honesto; inventar cidade não é.

type ProviderProfileRow = {
  id: string
  owner_user_id: string
  display_name: string
  category: ProviderCategory
  bio: string | null
}

type ReachRow = {
  scope_type: "community" | "locality"
  scope_id: string
}

async function resolveLocation(
  client: ReturnType<typeof createServerClient>,
  reach: ReachRow[],
): Promise<string | null> {
  const localityReach = reach.find((row) => row.scope_type === "locality")

  if (localityReach) {
    const { data, error } = await client
      .from("localities")
      .select("city_name, state_code")
      .eq("id", localityReach.scope_id)
      .maybeSingle()
    if (error) {
      log.error("prestadores: could not resolve locality", { error: error.message })
      return null
    }
    const row = data as { city_name: string; state_code: string } | null
    return row ? `${row.city_name}, ${row.state_code}` : null
  }

  const communityReach = reach.find((row) => row.scope_type === "community")
  if (!communityReach) return null

  const { data: community, error: communityError } = await client
    .from("communities")
    .select("locality_id")
    .eq("id", communityReach.scope_id)
    .maybeSingle()
  if (communityError || !community) {
    if (communityError) {
      log.error("prestadores: could not resolve community", { error: communityError.message })
    }
    return null
  }

  const { data: locality, error: localityError } = await client
    .from("localities")
    .select("city_name, state_code")
    .eq("id", (community as { locality_id: string }).locality_id)
    .maybeSingle()
  if (localityError || !locality) {
    if (localityError) {
      log.error("prestadores: could not resolve locality", { error: localityError.message })
    }
    return null
  }
  const row = locality as { city_name: string; state_code: string }
  return `${row.city_name}, ${row.state_code}`
}

export default async function ProviderShowcasePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: providerId } = await params

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
        // Server component, sem escrita de cookie.
      },
    },
  })

  const profileQuery = await authClient
    .from("provider_profiles")
    .select("id, owner_user_id, display_name, category, bio")
    .eq("id", providerId)
    .maybeSingle()

  if (profileQuery.error) {
    throw new Error(`Falha ao carregar a ficha: ${profileQuery.error.message}`)
  }

  const profile = profileQuery.data as ProviderProfileRow | null
  if (!profile) {
    notFound()
  }

  const details = await publicBusinessDetails(authClient, providerId)
  if (!details) notFound()
  const content = await businessContent(authClient, providerId)

  const reachQuery = await authClient
    .from("provider_reach")
    .select("scope_type, scope_id")
    .eq("provider_id", providerId)
    .eq("active", true)

  let location: string | null = null
  if (reachQuery.error) {
    log.error("prestadores: could not load reach", { error: reachQuery.error.message })
  } else {
    location = await resolveLocation(authClient, (reachQuery.data as ReachRow[] | null) ?? [])
  }

  const {
    data: { user },
  } = await authClient.auth.getUser()
  const isOwner = user?.id === profile.owner_user_id

  const occupation = PROVIDER_CATEGORY_LABELS[profile.category] ?? profile.category

  return (
    <div className="mx-auto w-full max-w-[72rem] px-4 pt-4 pb-8 sm:pt-6 lg:px-8">
      <Link
        href={"/explorar/servicos" as Route}
        className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-ui px-2 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
      >
        <ArrowLeft size={17} aria-hidden="true" />
        Serviços
      </Link>
      <Panel bodyClassName="p-5 sm:p-8">
        <header className="flex items-start gap-4 sm:gap-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-ui-lg bg-ui-brand-soft text-ui-brand sm:h-20 sm:w-20">
            <Building2 size={28} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <Eyebrow>{occupation}</Eyebrow>
            <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight text-ui-ink sm:text-4xl">
              {profile.display_name}
            </h1>
            {location ? (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-ui-ink-2">
                <MapPin size={16} aria-hidden="true" />
                {location}
              </p>
            ) : null}
          </div>
        </header>
      </Panel>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          {profile.bio ? (
            <Panel
              title="Sobre o negócio"
              titleId="business-about-title"
              bodyClassName="p-5 sm:p-6"
            >
              <p className="max-w-prose whitespace-pre-line [overflow-wrap:anywhere] text-base leading-relaxed text-ui-ink-2">
                {profile.bio}
              </p>
            </Panel>
          ) : null}
          <BusinessContent content={content} details={details} name={profile.display_name} />
        </div>
        <aside className="order-first lg:sticky lg:top-6 lg:order-none">
          {isOwner ? (
            <Panel
              title="Esta é sua página"
              titleId="business-owner-title"
              bodyClassName="space-y-4 p-5"
            >
              <p className="text-sm leading-relaxed text-ui-ink-2">
                É assim que outros membros encontram seu negócio.
              </p>
              <ButtonLink href="/negocio" variant="primary" className="w-full">
                Gerenciar meu negócio
              </ButtonLink>
            </Panel>
          ) : (
            <Panel
              title="Como podemos ajudar?"
              titleId="business-contact-title"
              bodyClassName="space-y-4 p-5"
            >
              <p className="text-sm leading-relaxed text-ui-ink-2">
                Conte o que você precisa e combine os detalhes diretamente com o negócio.
              </p>
              <ProviderActions
                providerId={profile.id}
                providerUserId={profile.owner_user_id}
                contact={details}
              />
              <p className="text-xs leading-relaxed text-ui-ink-2">
                O pedido é enviado somente a este negócio.
              </p>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  )
}
