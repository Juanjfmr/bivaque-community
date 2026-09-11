import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import { ArrowLeft, ImageOff, MapPin, Wrench } from "lucide-react"
import type { Route } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"
import { log } from "../../../../lib/logger"
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

type CatalogItemRow = {
  id: string
  title: string
  description: string | null
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

  const catalogQuery = await authClient
    .from("provider_catalog_items")
    .select("id, title, description")
    .eq("provider_id", providerId)
    .order("position")

  if (catalogQuery.error) {
    throw new Error(`Falha ao carregar os serviços: ${catalogQuery.error.message}`)
  }
  const catalog = (catalogQuery.data as CatalogItemRow[] | null) ?? []

  const photoQuery = await authClient
    .from("provider_portfolio_photos")
    .select("photo_path, caption")
    .eq("provider_id", providerId)
    .order("position")
    .limit(1)

  if (photoQuery.error) {
    throw new Error(`Falha ao carregar a foto: ${photoQuery.error.message}`)
  }

  const firstPhoto = (
    photoQuery.data as { photo_path: string; caption: string | null }[] | null
  )?.[0]
  let photoUrl: string | null = null
  if (firstPhoto) {
    const signed = await authClient.storage
      .from("provider-photos")
      .createSignedUrl(firstPhoto.photo_path, 3600)
    photoUrl = signed.data?.signedUrl ?? null
  }

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

  const occupation = PROVIDER_CATEGORY_LABELS[profile.category] ?? profile.category

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-8">
      <Link
        href={"/explorar" as Route}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:text-foreground"
      >
        <ArrowLeft size={18} aria-hidden="true" />
        Voltar à exploração
      </Link>

      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,22rem)_1fr] md:items-start">
        <div className="overflow-hidden rounded-2xl border border-border bg-[var(--semantic-surface-sunken)]">
          {photoUrl ? (
            // biome-ignore lint/performance/noImgElement: URL assinada de bucket privado expira em 1h; o otimizador de imagem colocaria link volátil em cache permanente.
            <img
              src={photoUrl}
              alt={firstPhoto?.caption ?? `Foto do trabalho de ${profile.display_name}`}
              className="aspect-[4/5] w-full object-cover"
            />
          ) : (
            <div
              role="img"
              aria-label="Este prestador ainda não publicou foto"
              className="flex aspect-[4/5] w-full items-center justify-center text-muted"
            >
              <ImageOff size={40} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{profile.display_name}</h1>
            <p className="text-sm text-muted">{occupation}</p>
            {location ? (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <MapPin size={16} aria-hidden="true" />
                {location}
              </p>
            ) : null}
          </header>

          {profile.bio ? (
            <p className="measure-reading max-w-prose text-sm leading-relaxed text-muted">
              {profile.bio}
            </p>
          ) : null}

          <section aria-labelledby="servicos-titulo" className="flex flex-col gap-3">
            <h2 id="servicos-titulo" className="text-base font-semibold tracking-tight">
              Serviços
            </h2>
            <hr className="border-border" />
            {catalog.length === 0 ? (
              <p className="text-sm text-muted">Este prestador ainda não cadastrou serviços.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {catalog.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]"
                    >
                      <Wrench size={16} />
                    </span>
                    <span className="text-sm font-medium">{item.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ProviderActions providerId={profile.id} providerUserId={profile.owner_user_id} />
        </div>
      </div>
    </div>
  )
}
