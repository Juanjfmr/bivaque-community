"use client"

import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@bivaque/domain"
import { Button } from "@heroui/react"
import { ArrowLeft, ChevronDown, MapPin } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocalityContext } from "../../../../lib/locality-context"
import {
  isSessionExpiredError,
  paginate,
  resolvePage,
  resolveTerm,
} from "../../../../lib/search/params"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { Card } from "../../../components/bivaque/card"
import { AccessUnavailableState, EmptyState } from "../../../components/bivaque/empty-state"
import { ErrorState } from "../../../components/bivaque/error-state"
import { ProviderCardSkeleton } from "../../../components/bivaque/skeleton"

// Prancha 61-web-explorar-servicos, desktop da direita (RECON-003, busca
// fechada por RECON-021).
//
// A busca é o RPC public.search_providers que já existe (onda G Task 5):
// ele devolve id, display_name, category, bio e reach_source, e a RLS de
// can_see_provider decide o alcance — o filtro de comunidade apenas
// restringe o que já seria visível. reach_source NÃO é exibido: um selo
// free/paid seria um sinal de promoção que nenhum dado da prancha sustenta.
//
// O filtro "Bairro" mapeia ao p_community_id do RPC: a comunidade é o
// agrupamento local real que existe no banco. A linha de localização do
// cartão vem do mesmo provider_reach que autoriza a visibilidade (nome da
// comunidade de alcance, ou cidade quando o alcance é a localidade) — nunca
// de um endereço residencial, que o contrato de privacidade proíbe guardar.
//
// `q` é o parâmetro canônico do termo (spec §3.2); `search` é aceito só na
// borda, por link antigo, e é normalizado para `q` ao abrir a página.

const PAGE_SIZE = 10

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

type ReachRow = {
  provider_id: string
  scope_type: "community" | "locality"
  scope_id: string
}

type SearchStatus = "loading" | "ok" | "error" | "expired"

const CATEGORY_OPTIONS = Object.entries(PROVIDER_CATEGORY_LABELS) as [ProviderCategory, string][]

function ProviderCard({
  provider,
  photo,
  location,
}: {
  provider: ProviderRow
  photo: ProviderPhoto | null
  location: string | null
}) {
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
          {location !== null && (
            <p className="flex items-center gap-1 text-xs text-muted">
              <MapPin size={12} aria-hidden="true" className="shrink-0" />
              {location}
            </p>
          )}
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

  const term = resolveTerm((key) => searchParams.get(key))
  const bairro = searchParams.get("bairro") ?? ""
  const tipo = searchParams.get("tipo") ?? ""
  const page = resolvePage(searchParams.get("page"))
  const hasFilters = bairro !== "" || tipo !== ""

  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [photos, setPhotos] = useState<Record<string, ProviderPhoto>>({})
  const [locations, setLocations] = useState<Record<string, string>>({})
  const [communities, setCommunities] = useState<CommunityRow[]>([])
  const [status, setStatus] = useState<SearchStatus>("loading")
  // Respostas fora de ordem: só a busca mais recente pode escrever no estado.
  const searchSeq = useRef(0)

  // Borda: um link antigo ?search=… passa a viver como ?q=… imediatamente,
  // para que recarregar/voltar/abrir em nova aba nunca dependa do alias.
  useEffect(() => {
    if (searchParams.get("search") === null || searchParams.get("q") !== null) return
    const params = new URLSearchParams(searchParams.toString())
    const aliasValue = params.get("search")
    params.delete("search")
    if (aliasValue !== null && params.get("q") === null) params.set("q", aliasValue)
    const query = params.toString()
    router.replace(`/explorar/servicos${query === "" ? "" : `?${query}`}` as Route)
  }, [searchParams, router])

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
  // vira ErrorState com nova tentativa, que chama esta mesma função. Erro de
  // sessão é estado próprio: retry sem login não recupera nada.
  const runSearch = useCallback(async () => {
    const seq = searchSeq.current + 1
    searchSeq.current = seq

    setStatus("loading")
    setPhotos({})
    setLocations({})

    const { data, error: searchError } = await supabase.rpc("search_providers", {
      ...(term === "" ? {} : { p_query: term }),
      ...(bairro === "" ? {} : { p_community_id: bairro }),
      ...(tipo === "" ? {} : { p_category: tipo as ProviderCategory }),
    })

    if (seq !== searchSeq.current) return

    if (searchError) {
      console.error("explorar/servicos: provider search failed", searchError.message)
      setStatus(isSessionExpiredError(searchError) ? "expired" : "error")
      setProviders([])
      return
    }

    const rows = (data ?? []) as unknown as ProviderRow[]
    setProviders(rows)
    setStatus("ok")

    if (rows.length === 0) return

    // Linha de localização (prancha: pino + bairro/cidade). Vem do
    // provider_reach do próprio prestador — tabela que a RLS já abre só para
    // quem pode ver a ficha. Falha aqui degrada para "sem linha", nunca
    // inventa bairro.
    const { data: reachData, error: reachError } = await supabase
      .from("provider_reach")
      .select("provider_id, scope_type, scope_id")
      .in(
        "provider_id",
        rows.map((row) => row.id),
      )
      .eq("active", true)
      .order("scope_id")

    if (seq !== searchSeq.current) return
    if (!reachError && reachData) {
      const reachRows = reachData as unknown as ReachRow[]
      const communityIds = [
        ...new Set(reachRows.filter((r) => r.scope_type === "community").map((r) => r.scope_id)),
      ]
      let namesById: Record<string, string> = {}
      if (communityIds.length > 0) {
        const { data: communityRows, error: communityError } = await supabase
          .from("communities")
          .select("id, name")
          .in("id", communityIds)
        if (seq !== searchSeq.current) return
        if (!communityError && communityRows) {
          namesById = Object.fromEntries(
            (communityRows as CommunityRow[]).map((c) => [c.id, c.name]),
          )
        }
      }
      const nextLocations: Record<string, string> = {}
      for (const row of reachRows) {
        if (nextLocations[row.provider_id] !== undefined) continue
        if (row.scope_type === "community") {
          const name = namesById[row.scope_id]
          if (name) nextLocations[row.provider_id] = `${name}, ${current.cityName}`
        } else {
          nextLocations[row.provider_id] = `${current.cityName}, ${current.stateCode}`
        }
      }
      setLocations(nextLocations)
    }

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
  }, [supabase, term, bairro, tipo, current.cityName, current.stateCode])

  useEffect(() => {
    void runSearch()
  }, [runSearch])

  // A janela visível é derivada da lista autorizada inteira: a contagem
  // exibida usa os mesmos filtros e a mesma autorização da lista, e o `page`
  // vive na URL para sobreviver a recarregar, voltar e abrir em nova aba.
  const windowed = useMemo(() => paginate(providers, page, PAGE_SIZE), [providers, page])

  function applyParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    // O termo canônico é sempre reescrito como `q`; o alias antigo não
    // sobrevive a uma interação. Filtrar é um resultado novo: a página volta
    // para 1, senão o filtro ficaria selecionado sobre uma janela vazia.
    params.delete("search")
    if (term !== "" && params.get("q") === null) params.set("q", term)
    params.delete("page")
    for (const [key, value] of Object.entries(next)) {
      if (value === "") params.delete(key)
      else params.set(key, value)
    }
    const query = params.toString()
    // push (não replace): voltar/avançar percorre os estados de filtro.
    router.push(`/explorar/servicos${query === "" ? "" : `?${query}`}` as Route)
  }

  function goToPage(target: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("search")
    if (term !== "" && params.get("q") === null) params.set("q", term)
    if (target <= 1) params.delete("page")
    else params.set("page", String(target))
    const query = params.toString()
    router.push(`/explorar/servicos${query === "" ? "" : `?${query}`}` as Route)
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="flex items-center gap-2">
        <Link
          href="/explorar"
          aria-label="Voltar para Explorar"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          {term === "" ? "Prestadores de serviço" : `Resultados para “${term}”`}
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
              className="min-h-11 w-full appearance-none rounded-lg border border-border bg-[var(--semantic-surface)] px-3 pr-9 text-sm transition-colors duration-[var(--semantic-motion-duration-instant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
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
              className="min-h-11 w-full appearance-none rounded-lg border border-border bg-[var(--semantic-surface)] px-3 pr-9 text-sm transition-colors duration-[var(--semantic-motion-duration-instant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
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
        {status === "loading" ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            <ProviderCardSkeleton />
            <ProviderCardSkeleton />
            <ProviderCardSkeleton />
          </div>
        ) : status === "expired" ? (
          <AccessUnavailableState
            title="Sua sessão expirou"
            description="Entre de novo para buscar prestadores. O termo e os filtros continuam na página anterior."
            primaryAction={
              <Link
                href={`/login?redirect=${encodeURIComponent(`/explorar/servicos?q=${term}`)}`}
                className="flex min-h-11 items-center rounded-lg bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-opacity duration-[var(--semantic-motion-duration-instant)] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
              >
                Entrar novamente
              </Link>
            }
          />
        ) : status === "error" ? (
          <ErrorState
            message="Não foi possível buscar os prestadores agora."
            onRetry={() => void runSearch()}
          />
        ) : windowed.total === 0 ? (
          <EmptyState
            title="Nenhum prestador encontrado"
            description={
              term === ""
                ? "Nenhum prestador corresponde aos filtros atuais."
                : `Nenhum prestador corresponde a “${term}” com os filtros atuais.`
            }
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                {hasFilters && (
                  <Button
                    variant="tertiary"
                    className="min-h-11"
                    onPress={() => applyParams({ bairro: "", tipo: "" })}
                  >
                    Limpar filtros
                  </Button>
                )}
                <Link
                  href="/localidade"
                  className="flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
                >
                  Trocar de cidade
                </Link>
              </div>
            }
          />
        ) : (
          <>
            <p className="text-sm text-muted">
              {windowed.total} resultado{windowed.total === 1 ? "" : "s"} encontrado
              {windowed.total === 1 ? "" : "s"}
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {windowed.items.map((provider) => (
                <li key={provider.id}>
                  <ProviderCard
                    provider={provider}
                    photo={photos[provider.id] ?? null}
                    location={locations[provider.id] ?? null}
                  />
                </li>
              ))}
            </ul>
            {windowed.pageCount > 1 && (
              <nav aria-label="Paginação de resultados" className="mt-4 flex items-center gap-2">
                <Button
                  variant="tertiary"
                  className="min-h-11"
                  isDisabled={windowed.page <= 1}
                  onPress={() => goToPage(windowed.page - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted">
                  Página {windowed.page} de {windowed.pageCount}
                </span>
                <Button
                  variant="tertiary"
                  className="min-h-11"
                  isDisabled={windowed.page >= windowed.pageCount}
                  onPress={() => goToPage(windowed.page + 1)}
                >
                  Próxima
                </Button>
              </nav>
            )}
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
