"use client"

import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@bivaque/domain"
import { Button } from "@heroui/react"
import { ArrowLeft, ChevronDown } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useLocalityContext } from "../../../../lib/locality-context"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { Card } from "../../../components/bivaque/card"
import { EmptyState } from "../../../components/bivaque/empty-state"
import { ErrorState } from "../../../components/bivaque/error-state"
import { ProviderCardSkeleton } from "../../../components/bivaque/skeleton"

// Prancha 61-web-explorar-servicos, desktop da direita (RECON-003).
//
// A busca é o RPC public.search_providers que já existe (onda G Task 5):
// ele devolve id, display_name, category, bio e reach_source, e a RLS de
// can_see_provider decide o alcance — o filtro de comunidade apenas
// restringe o que já seria visível. reach_source NÃO é exibido: um selo
// free/paid seria um sinal de promoção que nenhum dado da prancha sustenta.
//
// O filtro "Bairro" mapeia ao p_community_id do RPC: a comunidade é o
// agrupamento local real que existe no banco. Não há coluna de bairro em
// provider_profiles, e derivar uma localidade do alcance de visibilidade
// seria inventar dado — por isso a ficha mostra nome, categoria, bio e a
// primeira foto de portfólio quando ela existe, nada além disso.

type ProviderRow = {
  id: string
  display_name: string
  category: ProviderCategory
  bio: string | null
}

type CommunityRow = {
  id: string
  name: string
}

type PortfolioPhotoRow = {
  provider_id: string
  photo_path: string
  caption: string | null
}

type ProviderPhoto = {
  url: string
  caption: string | null
}

const CATEGORY_OPTIONS = Object.entries(PROVIDER_CATEGORY_LABELS) as [ProviderCategory, string][]

function ProviderCard({ provider, photo }: { provider: ProviderRow; photo: ProviderPhoto | null }) {
  const router = useRouter()

  return (
    <Card className="h-full">
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        {photo !== null ? (
          // biome-ignore lint/performance/noImgElement: URL assinada de bucket privado expira em 1h; o otimizador de imagem colocaria link volátil em cache permanente (mesmo motivo da ficha do prestador).
          <img
            src={photo.url}
            alt={photo.caption ?? "Foto de trabalho do prestador"}
            className="h-40 w-full shrink-0 rounded-lg border border-border object-cover sm:h-32 sm:w-44"
          />
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-sm font-semibold">{provider.display_name}</h2>
          <p className="text-xs font-medium text-[var(--accent)]">
            {PROVIDER_CATEGORY_LABELS[provider.category]}
          </p>
          {provider.bio !== null && provider.bio !== "" ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted">{provider.bio}</p>
          ) : null}
          <Button
            variant="tertiary"
            className="mt-2 self-start min-h-11"
            onPress={() => router.push(`/prestadores/${provider.id}`)}
          >
            Ver ficha
          </Button>
        </div>
      </div>
    </Card>
  )
}

function ServicosContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { current } = useLocalityContext()
  const supabase = createBrowserClient()

  const term = searchParams.get("search")?.trim() ?? ""
  const bairro = searchParams.get("bairro") ?? ""
  const tipo = searchParams.get("tipo") ?? ""
  const hasFilters = bairro !== "" || tipo !== ""

  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [photos, setPhotos] = useState<Record<string, ProviderPhoto>>({})
  const [communities, setCommunities] = useState<CommunityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Respostas fora de ordem: só a busca mais recente pode escrever no estado.
  const searchSeq = useRef(0)

  // Bairros (comunidades da localidade atual) alimentam o filtro. Consulta
  // auxiliar: a RLS já expõe o metadado a membros da localidade; erro aqui
  // degrada para o filtro sem opções, nunca inventa nome.
  useEffect(() => {
    let cancelled = false
    supabase
      .from("communities")
      .select("id, name")
      .eq("locality_id", current.id)
      .eq("is_deleted", false)
      .order("name")
      .then(({ data, error: communitiesError }) => {
        if (cancelled) return
        if (communitiesError) {
          console.error("explorar/servicos: could not load communities", communitiesError.message)
          setCommunities([])
          return
        }
        setCommunities((data ?? []) as CommunityRow[])
      })
    return () => {
      cancelled = true
    }
  }, [supabase, current.id])

  // Caminho crítico: a busca em si. Erro do RPC NUNCA vira lista vazia —
  // vira ErrorState com nova tentativa, que chama esta mesma função.
  const runSearch = useCallback(async () => {
    const seq = searchSeq.current + 1
    searchSeq.current = seq

    setLoading(true)
    setError(null)
    setPhotos({})

    const { data, error: searchError } = await supabase.rpc("search_providers", {
      ...(term === "" ? {} : { p_query: term }),
      ...(bairro === "" ? {} : { p_community_id: bairro }),
      ...(tipo === "" ? {} : { p_category: tipo as ProviderCategory }),
    })

    if (seq !== searchSeq.current) return

    if (searchError) {
      console.error("explorar/servicos: provider search failed", searchError.message)
      setError("search")
      setProviders([])
      setLoading(false)
      return
    }

    const rows = (data ?? []) as unknown as ProviderRow[]
    setProviders(rows)
    setLoading(false)

    if (rows.length === 0) return

    // Fotos são enriquecimento opcional: primeira por prestador, URL
    // assinada curta do bucket privado, mesmo padrão da ficha do
    // prestador. Falha aqui renderiza a ficha sem foto — sem placeholder
    // falso.
    const { data: photoRows, error: photosError } = await supabase
      .from("provider_portfolio_photos")
      .select("provider_id, photo_path, caption")
      .in(
        "provider_id",
        rows.map((row) => row.id),
      )
      .order("position")

    if (seq !== searchSeq.current) return

    if (photosError) {
      console.error("explorar/servicos: could not load photos", photosError.message)
      return
    }

    const firstByProvider = new Map<string, PortfolioPhotoRow>()
    for (const photo of (photoRows ?? []) as unknown as PortfolioPhotoRow[]) {
      if (!firstByProvider.has(photo.provider_id)) {
        firstByProvider.set(photo.provider_id, photo)
      }
    }

    const entries = await Promise.all(
      Array.from(firstByProvider, async ([providerId, photo]) => {
        const signed = await supabase.storage
          .from("provider-photos")
          .createSignedUrl(photo.photo_path, 3600)
        const url = signed.data?.signedUrl
        if (!url) return null
        return [providerId, { url, caption: photo.caption }] as const
      }),
    )

    if (seq !== searchSeq.current) return
    setPhotos(Object.fromEntries(entries.filter((entry) => entry !== null)))
  }, [supabase, term, bairro, tipo])

  useEffect(() => {
    void runSearch()
  }, [runSearch])

  function applyParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === "") params.delete(key)
      else params.set(key, value)
    }
    const query = params.toString()
    router.replace(`/explorar/servicos${query === "" ? "" : `?${query}`}` as Route)
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="flex items-center gap-2">
        <Link
          href="/explorar"
          aria-label="Voltar"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] hover:text-foreground"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          {term === "" ? "Prestadores de serviço" : `Resultados para "${term}"`}
        </h1>
      </div>

      <div className="mt-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-bairro" className="text-xs font-medium text-muted">
            Bairro
          </label>
          <div className="relative">
            <select
              id="filtro-bairro"
              value={bairro}
              onChange={(event) => applyParams({ bairro: event.target.value })}
              className="min-h-11 w-full appearance-none rounded-lg border border-border bg-[var(--semantic-surface)] px-3 pr-9 text-sm transition-colors duration-[var(--semantic-motion-duration-instant)]"
            >
              <option value="">Todos os bairros</option>
              {communities.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-tipo" className="text-xs font-medium text-muted">
            Tipo de serviço
          </label>
          <div className="relative">
            <select
              id="filtro-tipo"
              value={tipo}
              onChange={(event) => applyParams({ tipo: event.target.value })}
              className="min-h-11 w-full appearance-none rounded-lg border border-border bg-[var(--semantic-surface)] px-3 pr-9 text-sm transition-colors duration-[var(--semantic-motion-duration-instant)]"
            >
              <option value="">Todos os tipos</option>
              {CATEGORY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            />
          </div>
        </div>

        <Button
          variant="tertiary"
          className="min-h-11"
          onPress={() => applyParams({ bairro: "", tipo: "" })}
        >
          Limpar filtros
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            <ProviderCardSkeleton />
            <ProviderCardSkeleton />
            <ProviderCardSkeleton />
          </div>
        ) : error !== null ? (
          <ErrorState
            message="Não foi possível buscar os prestadores agora."
            onRetry={() => void runSearch()}
          />
        ) : providers.length === 0 ? (
          <EmptyState
            title="Nenhum prestador encontrado"
            description={
              term === ""
                ? "Nenhum prestador corresponde aos filtros atuais."
                : `Nenhum prestador corresponde a "${term}" com os filtros atuais.`
            }
            {...(hasFilters
              ? {
                  action: (
                    <Button
                      variant="tertiary"
                      className="min-h-11"
                      onPress={() => applyParams({ bairro: "", tipo: "" })}
                    >
                      Limpar filtros
                    </Button>
                  ),
                }
              : {})}
          />
        ) : (
          <>
            <p className="text-sm text-muted">
              {providers.length} resultado{providers.length === 1 ? "" : "s"} encontrado
              {providers.length === 1 ? "" : "s"}
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {providers.map((provider) => (
                <li key={provider.id}>
                  <ProviderCard provider={provider} photo={photos[provider.id] ?? null} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

export default function ServicosPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-4 py-6" aria-busy="true">
          <h1 className="text-xl font-semibold tracking-tight">Prestadores de serviço</h1>
          <div className="mt-6 flex flex-col gap-3">
            <ProviderCardSkeleton />
            <ProviderCardSkeleton />
            <ProviderCardSkeleton />
          </div>
        </div>
      }
    >
      <ServicosContent />
    </Suspense>
  )
}
