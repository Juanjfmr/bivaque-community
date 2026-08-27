import { Button, Input, TextArea } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import type { Route } from "next"
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

// Onda G Task 4 — catálogo e portfólio do prestador. Toda leitura passa pelo
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
        <h1 className="text-2xl font-semibold">Catálogo e portfólio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie sua ficha primeiro — o catálogo se prende a ela.
        </p>
        <div className="mt-3 text-sm">
          <Link
            href={"/prestador/ficha" as Route}
            className="min-h-11 px-1 leading-[2.75rem] underline"
          >
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
  if (catalogError) throw new Error(`Falha ao carregar o catálogo: ${catalogError.message}`)
  const catalog = (catalogData ?? []) as CatalogRow[]

  const { data: photosData, error: photosError } = await authClient
    .from("provider_portfolio_photos")
    .select("id, photo_path, caption")
    .eq("provider_id", profileId)
    .order("position")
  if (photosError) throw new Error(`Falha ao carregar o portfólio: ${photosError.message}`)
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
        <form action={saveCatalogItemAction} aria-label="Publicar item" className="mt-4 space-y-4">
          <input type="hidden" name="providerId" value={profileId} />
          <div>
            <label htmlFor="novo-titulo" className="text-sm font-medium">
              Título do item
            </label>
            {/* Par label+htmlFor: o Input da HeroUI instalada não repassa
                aria-label para a árvore de acessibilidade (Task 2, lição
                reconfirmada pelos E2E da Task 9). */}
            <Input
              id="novo-titulo"
              name="title"
              placeholder="O que você oferece (ex.: Limpeza de ar-condicionado)"
              required
              minLength={2}
              maxLength={120}
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="nova-descricao" className="text-sm font-medium">
              Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <TextArea
              id="nova-descricao"
              name="description"
              placeholder="Detalhes, prazos, o que está incluso"
              className="mt-1 w-full"
            />
          </div>
          <div>
            <label htmlFor="novo-preco" className="text-sm font-medium">
              Preço em centavos{" "}
              <span className="font-normal text-muted-foreground">(vazio é sob orçamento)</span>
            </label>
            <Input
              id="novo-preco"
              name="priceCents"
              type="number"
              inputMode="numeric"
              min={0}
              className="mt-1"
            />
          </div>
          <Button type="submit" variant="primary" size="md">
            Publicar
          </Button>
        </form>
      </section>

      <section aria-label="Meu catálogo" className="space-y-3">
        <h2 className="text-lg font-medium">Meu catálogo</h2>
        {catalog.length === 0 ? (
          <p className="text-sm text-muted">Nenhum item publicado ainda.</p>
        ) : (
          <ul className="space-y-3">
            {catalog.map((item) => (
              <li key={item.id} className="rounded-lg border border-border bg-surface p-4">
                {/* Título visível fora do form: o valor do input não aparece
                    em leitura de tela nem em listagem — o cartão precisa
                    identificar o item à primeira vista. */}
                <p className="text-sm font-semibold">{item.title}</p>
                <form action={saveCatalogItemAction} className="mt-3 space-y-3">
                  <input type="hidden" name="itemId" value={item.id} />
                  <div>
                    <label htmlFor={`titulo-${item.id}`} className="text-sm font-medium">
                      Título
                    </label>
                    <Input
                      id={`titulo-${item.id}`}
                      name="title"
                      defaultValue={item.title}
                      required
                      minLength={2}
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <label htmlFor={`descricao-${item.id}`} className="text-sm font-medium">
                      Descrição
                    </label>
                    <TextArea
                      id={`descricao-${item.id}`}
                      name="description"
                      defaultValue={item.description ?? ""}
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label htmlFor={`preco-${item.id}`} className="text-sm font-medium">
                      Preço em centavos
                    </label>
                    <Input
                      id={`preco-${item.id}`}
                      name="priceCents"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      defaultValue={item.price_cents !== null ? String(item.price_cents) : ""}
                      placeholder="Vazio é sob orçamento"
                    />
                  </div>
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
                      ↑ Subir
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      formAction={moveCatalogItemDownAction}
                      name="rowId"
                      value={item.id}
                    >
                      ↓ Descer
                    </Button>
                  </div>
                </form>
                {item.price_cents !== null ? (
                  <p className="mt-2 text-xs text-muted">Hoje: {formatPrice(item.price_cents)}</p>
                ) : (
                  <p className="mt-2 text-xs text-muted">Hoje: sob orçamento</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-label="Adicionar foto ao portfólio"
        className="rounded-lg border border-border bg-surface p-5"
      >
        <h2 className="text-lg font-medium">Adicionar foto ao portfólio</h2>
        <form action={addPortfolioPhotoAction} className="mt-4 space-y-3">
          <div>
            <label htmlFor="foto-arquivo" className="text-sm font-medium">
              Escolher imagem{" "}
              <span className="font-normal text-muted-foreground">
                (JPEG, PNG ou WebP até 5 MB)
              </span>
            </label>
            {/* accept alinhado ao allowed_mime_types do bucket; max via validação server-side. */}
            <input
              id="foto-arquivo"
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="mt-1 block min-h-11 w-full cursor-pointer text-sm"
            />
          </div>
          <TextArea
            id="legenda-nova"
            name="caption"
            placeholder="Legenda (opcional)"
            aria-label="Legenda da foto"
          />
          <Button type="submit" variant="primary" size="md">
            Publicar foto
          </Button>
        </form>
      </section>

      <section aria-label="Meu portfólio" className="space-y-3">
        <h2 className="text-lg font-medium">Meu portfólio</h2>
        {photoRows.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma foto publicada ainda.</p>
        ) : (
          <ul className="space-y-3">
            {photoRows.map((photo) => {
              const url = urlById.get(photo.id)
              return (
                <li key={photo.id} className="rounded-lg border border-border bg-surface p-4">
                  {url ? (
                    // biome-ignore lint/performance/noImgElement: URL assinada de bucket privado expira em 1h; otimizador colocaria link volátil em cache.
                    <img
                      src={url}
                      alt={photo.caption ?? "Foto do portfólio"}
                      className="aspect-4/3 w-full rounded-md border border-border object-cover"
                    />
                  ) : (
                    <div
                      role="img"
                      aria-label={photo.caption ?? "Foto indisponível"}
                      className="aspect-4/3 w-full rounded-md border border-border bg-[var(--paper)]"
                    />
                  )}
                  <form action={updatePhotoCaptionAction} className="mt-3 space-y-2">
                    <input type="hidden" name="photoId" value={photo.id} />
                    <label
                      htmlFor={`legenda-${photo.id}`}
                      className="text-xs font-medium text-muted"
                    >
                      Legenda da foto
                    </label>
                    <TextArea
                      id={`legenda-${photo.id}`}
                      name="caption"
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
                        ↑ Subir
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        formAction={movePortfolioPhotoDownAction}
                        name="rowId"
                        value={photo.id}
                      >
                        ↓ Descer
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
