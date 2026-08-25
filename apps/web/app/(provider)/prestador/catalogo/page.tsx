import { Button, Input, TextArea } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import Link from "next/link"
import {
  addPortfolioPhotoAction,
  deleteCatalogItemAction,
  deletePortfolioPhotoAction,
  moveCatalogItemDownAction,
  moveCatalogItemUpAction,
  movePortfolioPhotoDownAction,
  movePortfolioPhotoUpAction,
  saveCatalogItemAction,
  updatePhotoCaptionAction,
} from "../actions"

// Onda G Task 4 â€” catÃ¡logo e portfÃ³lio do prestador. Toda leitura passa pelo
// cliente autenticado (RLS owner-only); fotos do bucket privado aparecem por
// URL assinada curta gerada aqui no servidor.

type CatalogRow = {
  id: string
  title: string
  description: string | null
  price_cents: number | null
}

type PhotoRow = {
  id: string
  photo_path: string
  caption: string | null
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default async function PrestadorCatalogoPage() {
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

  const { data: profile, error: profileError } = await authClient
    .from("provider_profiles")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle()
  if (profileError) throw new Error(`Falha ao localizar a ficha: ${profileError.message}`)

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold">CatÃ¡logo e portfÃ³lio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie sua ficha primeiro â€” o catÃ¡logo se prende a ela.
        </p>
        <div className="mt-3 text-sm">
          <Link href="/prestador/ficha" className="min-h-11 px-1 leading-[2.75rem] underline">
            Criar minha ficha
          </Link>
        </div>
      </main>
    )
  }

  const profileId = profile.id as string

  const { data: catalogData, error: catalogError } = await authClient
    .from("provider_catalog_items")
    .select("id, title, description, price_cents")
    .eq("provider_id", profileId)
    .order("position")
  if (catalogError) throw new Error(`Falha ao carregar o catÃ¡logo: ${catalogError.message}`)
  const catalog = (catalogData ?? []) as CatalogRow[]

  const { data: photosData, error: photosError } = await authClient
    .from("provider_portfolio_photos")
    .select("id, photo_path, caption")
    .eq("provider_id", profileId)
    .order("position")
  if (photosError) throw new Error(`Falha ao carregar o portfÃ³lio: ${photosError.message}`)
  const photoRows = (photosData ?? []) as PhotoRow[]

  const photoUrls = await Promise.all(
    photoRows.map(async (photo) => {
      const signed = await authClient.storage
        .from("provider-photos")
        .createSignedUrl(photo.photo_path, 3600)
      return { id: photo.id, url: signed.data?.signedUrl ?? null }
    }),
  )
  const urlById = new Map(photoUrls.map((entry) => [entry.id, entry.url]))

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-6 py-10">
      <section
        aria-label="Publicar item"
        className="rounded-lg border border-border bg-surface p-5"
      >
        <h1 className="text-lg font-medium">Publicar item</h1>
        <form action={saveCatalogItemAction} className="mt-4 space-y-4">
          <input type="hidden" name="providerId" value={profileId} />
          <Input
            name="title"
            aria-label="TÃ­tulo do item"
            placeholder="O que vocÃª oferece (ex.: Limpeza de ar-condicionado)"
            required
            minLength={2}
            maxLength={120}
          />
          <TextArea
            name="description"
            aria-label="DescriÃ§Ã£o do item"
            placeholder="Detalhes, prazos, o que estÃ¡ incluso (opcional)"
          />
          <Input
            name="priceCents"
            type="number"
            inputMode="numeric"
            min={0}
            aria-label="PreÃ§o em centavos"
            placeholder="PreÃ§o em centavos â€” vazio Ã© sob orÃ§amento"
          />
          <Button type="submit" variant="primary" size="md">
            Publicar
          </Button>
        </form>
      </section>

      <section aria-label="Meu catÃ¡logo" className="space-y-3">
        <h2 className="text-lg font-medium">Meu catÃ¡logo</h2>
        {catalog.length === 0 ? (
          <p className="text-sm text-muted">Nenhum item publicado ainda.</p>
        ) : (
          <ul className="space-y-3">
            {catalog.map((item) => (
              <li key={item.id} className="rounded-lg border border-border bg-surface p-4">
                <form action={saveCatalogItemAction} className="space-y-3">
                  <input type="hidden" name="itemId" value={item.id} />
                  <Input
                    name="title"
                    aria-label={`TÃ­tulo de ${item.title}`}
                    defaultValue={item.title}
                    required
                    minLength={2}
                    maxLength={120}
                  />
                  <TextArea
                    name="description"
                    aria-label={`DescriÃ§Ã£o de ${item.title}`}
                    defaultValue={item.description ?? ""}
                    placeholder="DescriÃ§Ã£o (opcional)"
                  />
                  <Input
                    name="priceCents"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    aria-label={`PreÃ§o em centavos de ${item.title}`}
                    defaultValue={item.price_cents !== null ? String(item.price_cents) : ""}
                    placeholder="Centavos â€” vazio Ã© sob orÃ§amento"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm" variant="primary">
                      Salvar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      variant="tertiary"
                      formAction={deleteCatalogItemAction}
                      name="itemId"
                      value={item.id}
                    >
                      Remover
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      formAction={moveCatalogItemUpAction}
                      name="rowId"
                      value={item.id}
                    >
                      â†‘ Subir
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      formAction={moveCatalogItemDownAction}
                      name="rowId"
                      value={item.id}
                    >
                      â†“ Descer
                    </Button>
                  </div>
                </form>
                {item.price_cents !== null ? (
                  <p className="mt-2 text-xs text-muted">Hoje: {formatPrice(item.price_cents)}</p>
                ) : (
                  <p className="mt-2 text-xs text-muted">Hoje: sob orÃ§amento</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-label="Adicionar foto ao portfÃ³lio"
        className="rounded-lg border border-border bg-surface p-5"
      >
        <h2 className="text-lg font-medium">Adicionar foto ao portfÃ³lio</h2>
        <form action={addPortfolioPhotoAction} className="mt-4 space-y-3">
          {/* accept alinhado ao allowed_mime_types do bucket; max via validaÃ§Ã£o server-side. */}
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp"
            required
            aria-label="Escolher imagem"
            className="block w-full text-sm"
          />
          <TextArea name="caption" aria-label="Legenda da foto" placeholder="Legenda (opcional)" />
          <Button type="submit" variant="primary" size="md">
            Publicar foto
          </Button>
        </form>
      </section>

      <section aria-label="Meu portfÃ³lio" className="space-y-3">
        <h2 className="text-lg font-medium">Meu portfÃ³lio</h2>
        {photoRows.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma foto publicada ainda.</p>
        ) : (
          <ul className="space-y-3">
            {photoRows.map((photo) => {
              const url = urlById.get(photo.id)
              return (
                <li key={photo.id} className="rounded-lg border border-border bg-surface p-4">
                  {url ? (
                    // biome-ignore lint/performance/noImgElement: URL assinada de bucket privado expira em 1h; otimizador colocaria link volÃ¡til em cache.
                    <img
                      src={url}
                      alt={photo.caption ?? "Foto do portfÃ³lio"}
                      className="aspect-4/3 w-full rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div
                      role="img"
                      aria-label={photo.caption ?? "Foto indisponÃ­vel"}
                      className="aspect-4/3 w-full rounded-md border border-border bg-[var(--paper)]"
                    />
                  )}
                  <form action={updatePhotoCaptionAction} className="mt-3 space-y-2">
                    <input type="hidden" name="photoId" value={photo.id} />
                    <TextArea
                      name="caption"
                      aria-label={`Legenda da foto`}
                      defaultValue={photo.caption ?? ""}
                      placeholder="Legenda (opcional)"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" size="sm" variant="primary">
                        Salvar legenda
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        variant="tertiary"
                        formAction={deletePortfolioPhotoAction}
                        name="photoId"
                        value={photo.id}
                      >
                        Remover
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        formAction={movePortfolioPhotoUpAction}
                        name="rowId"
                        value={photo.id}
                      >
                        â†‘ Subir
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        formAction={movePortfolioPhotoDownAction}
                        name="rowId"
                        value={photo.id}
                      >
                        â†“ Descer
                      </Button>
                    </div>
                  </form>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
