import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"

// Onda G Task 3, Step 5 — a ficha vista pelo membro.
//
// Leitura pelo CLIENTE AUTENTICADO (regra 1 da §12): a RLS de
// `provider_profiles` via `private.can_see_provider` é quem decide quem vê.
// Quem não pode ver recebe notFound() — e, lição do README do Next 16,
// isso responde 200 com a UI de não-encontrado, então qualquer asserção
// externa é sobre conteúdo presente/ausente, nunca sobre status HTTP.
//
// Ordem dos blocos é a D45: identidade, catálogo, portfólio. O botão
// "Conversar" deliberadamente NÃO existe até a Task 6 entregar o canal
// (regra 4 da §12: prefira ausência a botão desabilitado).

type ProviderProfileRow = {
  id: string
  display_name: string
  category: ProviderCategory
  bio: string | null
  contact_phone: string | null
  contact_is_public: boolean
}

type CatalogItemRow = {
  id: string
  title: string
  description: string | null
  price_cents: number | null
}

type PortfolioPhotoRow = {
  id: string
  photo_path: string
  caption: string | null
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
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
    .select("id, display_name, category, bio, contact_phone, contact_is_public")
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
    .select("id, title, description, price_cents")
    .eq("provider_id", providerId)
    .order("position")

  if (catalogQuery.error) {
    throw new Error(`Falha ao carregar o catálogo: ${catalogQuery.error.message}`)
  }
  const catalog = (catalogQuery.data as CatalogItemRow[] | null) ?? []

  const portfolioQuery = await authClient
    .from("provider_portfolio_photos")
    .select("id, photo_path, caption")
    .eq("provider_id", providerId)
    .order("position")

  if (portfolioQuery.error) {
    throw new Error(`Falha ao carregar o portfólio: ${portfolioQuery.error.message}`)
  }
  const photos = (portfolioQuery.data as PortfolioPhotoRow[] | null) ?? []

  // Bucket privado: URL assinada curta, gerada pelo próprio chamador
  // autenticado — a policy de select do storage reconfere o alcance.
  const photoUrls = await Promise.all(
    photos.map(async (photo) => {
      const signed = await authClient.storage
        .from("provider-photos")
        .createSignedUrl(photo.photo_path, 3600)
      return { ...photo, url: signed.data?.signedUrl ?? null }
    }),
  )

  const showContact = profile.contact_is_public && profile.contact_phone !== null

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-6 pb-8">
      <header className="space-y-1">
        <p className="text-xs font-semibold tracking-wide text-[var(--accent)] uppercase">
          {PROVIDER_CATEGORY_LABELS[profile.category] ?? profile.category}
        </p>
        <h1 className="text-xl font-semibold tracking-tight">{profile.display_name}</h1>
        {profile.bio ? <p className="text-sm leading-relaxed text-muted">{profile.bio}</p> : null}
        {showContact ? (
          <p className="text-sm">
            Contato: <span className="font-medium">{profile.contact_phone}</span>
          </p>
        ) : (
          <p className="text-xs text-muted">
            Este prestador prefere receber contato dentro do app por enquanto.
          </p>
        )}
      </header>

      <section aria-labelledby="catalogo-titulo" className="space-y-3">
        <h2 id="catalogo-titulo" className="text-base font-semibold tracking-tight">
          Catálogo
        </h2>
        {catalog.length === 0 ? (
          <p className="text-sm text-muted">Este prestador ainda não publicou itens.</p>
        ) : (
          <ul className="space-y-2">
            {catalog.map((item) => (
              <li key={item.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{item.title}</span>
                  {item.price_cents !== null ? (
                    <span className="whitespace-nowrap text-xs font-semibold">
                      {formatPrice(item.price_cents)}
                    </span>
                  ) : (
                    <span className="whitespace-nowrap text-xs text-muted">Sob orçamento</span>
                  )}
                </div>
                {item.description ? <p className="mt-1 text-muted">{item.description}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="portfolio-titulo" className="space-y-3">
        <h2 id="portfolio-titulo" className="text-base font-semibold tracking-tight">
          Portfólio
        </h2>
        {photos.length === 0 ? (
          <p className="text-sm text-muted">Sem fotos de trabalho publicadas.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {photoUrls.map((photo) => (
              <li key={photo.id} className="space-y-1">
                {photo.url ? (
                  // biome-ignore lint/performance/noImgElement: URL assinada de bucket privado expira em 1h; passar pelo otimizador de imagem colocaria link volátil em cache permanente.
                  <img
                    src={photo.url}
                    alt={photo.caption ?? "Foto de trabalho do prestador"}
                    className="aspect-4/3 w-full rounded-md border border-border object-cover"
                  />
                ) : (
                  <div
                    role="img"
                    aria-label={photo.caption ?? "Foto indisponível"}
                    className="aspect-4/3 w-full rounded-md border border-border bg-[var(--paper)]"
                  />
                )}
                {photo.caption ? <p className="text-xs text-muted">{photo.caption}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
