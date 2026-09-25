import { BedDouble, Car, MapPin, Ruler } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { formatMoney, headlinePrice } from "../../../lib/listings/costs"
import {
  BEDROOM_OPTIONS,
  filtersToQuery,
  MAX_VALUE_OPTIONS,
  parseListingFilters,
  type RawSearchParams,
  valueFilterLabel,
} from "../../../lib/listings/filters"
import { getSavedListingIds, searchProperties, signPhotoPaths } from "../../../lib/listings/queries"
import { createListingClient } from "../../../lib/listings/ssr-client"
import { PROPERTY_TYPE_LABELS, type PropertyType } from "../../../lib/listings/types"
import { Card } from "../../components/bivaque/card"
import { ListingAlertForm } from "./alert-form"
import { SaveListingButton } from "./save-listing-button"

// RECON-027 — prancha 65, painel 1. A busca de Moradia. A leitura passa pela
// RLS (`private.can_read_listing`): a tela lista o que o membro alcança, e uma
// conta fora do público não vê o anúncio nem por chamada direta.

const fieldClass =
  "min-h-11 rounded-xl border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-instant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"

function specsLabel(row: {
  bedrooms: number | null
  suites: number | null
  parkingSpots: number | null
  areaM2: number | null
}) {
  return {
    bedrooms:
      row.bedrooms === null ? null : `${row.bedrooms} quarto${row.bedrooms === 1 ? "" : "s"}`,
    suites: row.suites === null ? null : `${row.suites} suíte${row.suites === 1 ? "" : "s"}`,
    parking:
      row.parkingSpots === null
        ? null
        : `${row.parkingSpots} vaga${row.parkingSpots === 1 ? "" : "s"}`,
    area: row.areaM2 === null ? null : `${row.areaM2} m²`,
  }
}

export default async function ImoveisPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>
}) {
  const params = await searchParams
  const filters = parseListingFilters(params)

  const client = await createListingClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (user === null) {
    // O middleware já exige sessão no shell; aqui é defesa em profundidade.
    throw new Error("Sessão ausente para a busca de Moradia.")
  }

  const localityQuery = await client
    .from("locality_memberships")
    .select("locality_id, localities(city_name, state_code)")
    .eq("kind", "current")
    .maybeSingle()
  if (localityQuery.error) {
    throw new Error(`Falha ao resolver a cidade: ${localityQuery.error.message}`)
  }
  const localityRow = localityQuery.data as unknown as {
    locality_id: string
    localities: { city_name: string; state_code: string } | null
  } | null
  const localityId = localityRow?.locality_id ?? ""
  const cityLabel = localityRow?.localities
    ? `${localityRow.localities.city_name}, ${localityRow.localities.state_code}`
    : "sua cidade"

  const { rows, count } = await searchProperties(client, filters, {
    localityId,
    withCommunities: true,
  })
  const savedIds = await getSavedListingIds(
    client,
    rows.map((row) => row.id),
  )
  const covers = await signPhotoPaths(
    client,
    rows.map((row) => row.coverPath).filter((path): path is string => path !== null),
  )

  const neighborhoodQuery = filtersToQuery({ ...filters, neighborhood: null })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Explorar moradia</h1>
          <p className="text-sm text-muted">Encontre apartamentos para alugar em {cityLabel}</p>
        </div>
        {/* Anunciar e gerenciar alertas (prancha 65) só se alcançavam digitando a URL —
            achado do rastreador de links, 22/09/2026. */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/imoveis/alertas"
            className="flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-surface-hover)]"
          >
            Meus alertas
          </Link>
          <Link
            href="/imoveis/novo"
            className="flex min-h-11 items-center rounded-lg bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors"
          >
            Anunciar imóvel
          </Link>
        </div>
      </header>

      <form action="/imoveis" method="get" className="mt-5 flex flex-wrap items-center gap-2">
        {filters.search ? <input type="hidden" name="q" value={filters.search} /> : null}
        {filters.sort !== "recent" ? (
          <input type="hidden" name="sort" value={filters.sort} />
        ) : null}

        {filters.neighborhood ? (
          <span className="flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-[var(--semantic-selected)] px-3 text-sm">
            <MapPin size={14} aria-hidden="true" />
            {filters.neighborhood}
            <Link
              href={`/imoveis${neighborhoodQuery}` as Route}
              aria-label={`Remover o filtro de ${filters.neighborhood}`}
              className="ml-1 flex min-h-6 min-w-6 items-center justify-center rounded-full"
            >
              ×
            </Link>
          </span>
        ) : null}

        <label className="sr-only" htmlFor="filtro-negocio">
          Tipo de negócio
        </label>
        <select
          id="filtro-negocio"
          name="tipo_negocio"
          defaultValue={filters.deal ?? ""}
          className={fieldClass}
        >
          <option value="">Aluguel ou venda</option>
          <option value="rent">Aluguel</option>
          <option value="sale">Venda</option>
        </select>

        <label className="sr-only" htmlFor="filtro-valor">
          {valueFilterLabel(filters.deal)}
        </label>
        <select
          id="filtro-valor"
          name="valor_max"
          defaultValue={filters.maxValueCents !== null ? String(filters.maxValueCents / 100) : ""}
          className={fieldClass}
        >
          <option value="">{valueFilterLabel(filters.deal)}</option>
          {MAX_VALUE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              Até {formatMoney(value * 100)}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="filtro-quartos">
          Quartos
        </label>
        <select
          id="filtro-quartos"
          name="quartos"
          defaultValue={filters.minBedrooms !== null ? String(filters.minBedrooms) : ""}
          className={fieldClass}
        >
          <option value="">Quartos</option>
          {BEDROOM_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}+ quartos
            </option>
          ))}
        </select>

        <details className="contents">
          <summary className={`${fieldClass} flex cursor-pointer list-none items-center`}>
            Filtros
          </summary>
          <span className="flex w-full flex-wrap items-center gap-2 pt-2">
            <label className="sr-only" htmlFor="filtro-tipo">
              Tipo do imóvel
            </label>
            <select
              id="filtro-tipo"
              name="tipo"
              defaultValue={filters.propertyType ?? ""}
              className={fieldClass}
            >
              <option value="">Todos os tipos</option>
              {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((type) => (
                <option key={type} value={type}>
                  {PROPERTY_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </span>
        </details>

        <button
          type="submit"
          className="min-h-11 rounded-xl bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors duration-[var(--semantic-motion-duration-instant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
        >
          Filtrar
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">{count} resultados</p>
        <ListingAlertForm
          variant="full"
          hidden={{
            localityId,
            q: filters.search ?? "",
            bairro: filters.neighborhood ?? "",
            tipo_negocio: filters.deal ?? "",
            valor_max: filters.maxValueCents !== null ? String(filters.maxValueCents / 100) : "",
            quartos: filters.minBedrooms !== null ? String(filters.minBedrooms) : "",
            tipo: filters.propertyType ?? "",
          }}
        />
      </div>

      {count === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-[var(--semantic-surface)] p-6 text-center">
          <p className="text-sm font-medium">Nenhum imóvel encontrado com esses filtros.</p>
          <p className="mt-1 text-sm text-muted">
            Ajuste os filtros ou{" "}
            <Link href="/imoveis" className="underline">
              limpe a busca
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const specs = specsLabel(row)
            const coverUrl = row.coverPath ? covers.get(row.coverPath) : undefined
            return (
              <li key={row.id}>
                <Card className="h-full overflow-hidden">
                  <div className="relative">
                    {/* O link embrulha só a foto: sem nome próprio ele fica sem
                        rótulo (e "Sem foto" não diz qual imóvel é). O alt da
                        imagem continua descrevendo a foto. */}
                    <Link
                      href={`/imoveis/${row.id}` as Route}
                      aria-label={`Ver ${row.title}`}
                      className="block transition-opacity duration-[var(--semantic-motion-duration-fast)] hover:opacity-90"
                    >
                      {coverUrl ? (
                        // biome-ignore lint/performance/noImgElement: URL assinada de bucket privado expira em 1h.
                        <img
                          src={coverUrl}
                          alt={`Foto de ${row.title}`}
                          className="aspect-4/3 w-full object-cover"
                        />
                      ) : (
                        <div
                          role="img"
                          aria-label="Sem foto"
                          className="aspect-4/3 w-full bg-[var(--paper)]"
                        />
                      )}
                    </Link>
                    <SaveListingButton
                      listingId={row.id}
                      initialSaved={savedIds.has(row.id)}
                      className="absolute top-2 right-2"
                    />
                  </div>
                  <div className="space-y-1 p-4">
                    <p className="text-lg font-semibold text-[var(--semantic-action-primary)]">
                      {headlinePrice(row.deal, row)}
                    </p>
                    <p className="text-xs text-muted">
                      Condomínio:{" "}
                      {row.condoFeeCents === null
                        ? "Consultar anunciante"
                        : `${formatMoney(row.condoFeeCents)} / mês`}
                    </p>
                    <p className="text-sm">
                      {row.neighborhood ?? "Bairro não informado"}
                      {row.cityName ? `, ${row.cityName}` : ""}
                      {row.stateCode ? ` - ${row.stateCode}` : ""}
                    </p>
                    <p className="flex flex-wrap gap-3 pt-1 text-xs text-muted">
                      {specs.bedrooms ? (
                        <span className="flex items-center gap-1">
                          <BedDouble size={14} aria-hidden="true" />
                          {specs.bedrooms}
                        </span>
                      ) : null}
                      {specs.parking ? (
                        <span className="flex items-center gap-1">
                          <Car size={14} aria-hidden="true" />
                          {specs.parking}
                        </span>
                      ) : null}
                      {specs.area ? (
                        <span className="flex items-center gap-1">
                          <Ruler size={14} aria-hidden="true" />
                          {specs.area}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
