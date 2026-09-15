"use client"

import { Button, Chip, Dropdown, Modal, useOverlayState } from "@heroui/react"
import { CalendarDays, Info, MapPin, MoreHorizontal, Plus, Search, Users } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { formatCentsBRL } from "../../../lib/listings/catalog"
import { listingsClient } from "../../../lib/listings/client"
import {
  ACTION_LABELS,
  ACTION_TARGET,
  allowedActions,
  formatAvailableUntilLong,
  formatAvailableUntilShort,
  formatPublishedAt,
  LISTING_TABS,
  type ListingAction,
  type ListingTabKey,
  MANAGED_LISTING_SELECT,
  type ManagedListingRow,
  pickupLabel,
  statusGroup,
  statusLabel,
  statusTone,
  tabCounts,
} from "../../../lib/listings/lifecycle"
import { useLocalityContext } from "../../../lib/locality-context"
import { useMemberContext } from "../../../lib/member-context"
import { AccessUnavailableState, EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { Skeleton } from "../../components/bivaque/skeleton"
import { showToast } from "../../components/bivaque/toast"

const TONE_CLASS: Record<ReturnType<typeof statusTone>, string> = {
  active: "bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]",
  attention: "bg-[var(--semantic-warning-soft)] text-[var(--semantic-text-primary)]",
  done: "bg-[var(--semantic-surface-sunken)] text-[var(--semantic-text-secondary)]",
  muted: "bg-[var(--semantic-surface-sunken)] text-[var(--semantic-text-secondary)]",
}

type ConfirmAction = Extract<ListingAction, "pause" | "sell" | "close">

const CONFIRM_COPY: Record<ConfirmAction, { title: string; body: string; confirm: string }> = {
  pause: {
    title: "Pausar este anúncio?",
    body: "Ele deixará de aparecer nas buscas enquanto estiver pausado.",
    confirm: "Pausar anúncio",
  },
  sell: {
    title: "Marcar como vendido?",
    body: "Ele sai das buscas e passa para Encerrados. Você ainda pode reativá-lo.",
    confirm: "Marcar como vendido",
  },
  close: {
    title: "Encerrar este anúncio?",
    body: "Encerrado é definitivo: ele não volta a ficar ativo.",
    confirm: "Encerrar anúncio",
  },
}

const CONFIRM_ACTIONS: readonly ConfirmAction[] = ["pause", "sell", "close"]

interface ManageState {
  status: "loading" | "ready" | "error" | "signed-out"
  listings: ManagedListingRow[]
  photos: Record<string, string | null>
}

const INITIAL_STATE: ManageState = { status: "loading", listings: [], photos: {} }

export default function MeusAnunciosPage() {
  const router = useRouter()
  const { current } = useLocalityContext()
  const { communities } = useMemberContext()
  const [state, setState] = useState<ManageState>(INITIAL_STATE)
  const [tab, setTab] = useState<ListingTabKey>("active")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pending, setPending] = useState<{ listingId: string; action: ConfirmAction } | null>(null)
  const dialog = useOverlayState()

  const communityName = useCallback(
    (id: string | null) =>
      communities.find((community) => community.id === id)?.name ?? "Comunidade",
    [communities],
  )

  const audienceLabel = useCallback(
    (listing: ManagedListingRow) =>
      listing.community_id !== null ? communityName(listing.community_id) : current.cityName,
    [communityName, current.cityName],
  )

  const load = useCallback(async () => {
    setState(INITIAL_STATE)
    const supabase = listingsClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user === null) {
      setState({ status: "signed-out", listings: [], photos: {} })
      return
    }

    const { data, error } = await supabase
      .from("listings")
      .select(MANAGED_LISTING_SELECT)
      .eq("owner_user_id", user.id)
      .eq("kind", "item")
      .order("created_at", { ascending: false })

    if (error) {
      setState({ status: "error", listings: [], photos: {} })
      return
    }

    const rows = (data ?? []) as unknown as ManagedListingRow[]
    const photos: Record<string, string | null> = {}
    const ids = rows.map((row) => row.id)

    if (ids.length > 0) {
      const { data: photoRows } = await supabase
        .from("listing_photos")
        .select("listing_id,path,position")
        .in("listing_id", ids)
        .order("position", { ascending: true })

      const firstPath = new Map<string, string>()
      for (const photo of (photoRows ?? []) as {
        listing_id: string
        path: string
        position: number
      }[]) {
        if (!firstPath.has(photo.listing_id)) firstPath.set(photo.listing_id, photo.path)
      }
      const paths = Array.from(firstPath.values())
      if (paths.length > 0) {
        const { data: signed } = await supabase.storage
          .from("listing-photos")
          .createSignedUrls(paths, 3600)
        const urlByPath = new Map<string, string>()
        for (const entry of signed ?? []) {
          if (entry.path !== null && entry.signedUrl !== null) {
            urlByPath.set(entry.path, entry.signedUrl)
          }
        }
        for (const row of rows) {
          const path = firstPath.get(row.id) ?? null
          photos[row.id] = path === null ? null : (urlByPath.get(path) ?? null)
        }
      }
    }

    setState({ status: "ready", listings: rows, photos })
    setSelectedId((previous) =>
      previous !== null && rows.some((row) => row.id === previous)
        ? previous
        : (rows[0]?.id ?? null),
    )
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function runAction(listingId: string, action: ListingAction) {
    if (busyId !== null) return
    const previous = state.listings
    const target = ACTION_TARGET[action]
    setBusyId(listingId)
    setState((currentState) => ({
      ...currentState,
      listings: currentState.listings.map((listing) =>
        listing.id === listingId ? { ...listing, status: target } : listing,
      ),
    }))

    const supabase = listingsClient()
    const { error } = await supabase.rpc("transition_listing", {
      p_listing_id: listingId,
      p_action: action,
    })

    if (error) {
      setState((currentState) => ({ ...currentState, listings: previous }))
      showToast({
        title: "Não foi possível atualizar o anúncio",
        description: "A situação voltou ao que era. Tente novamente.",
        variant: "danger",
      })
    } else {
      showToast({ title: `${ACTION_LABELS[action]}.`, variant: "success" })
    }
    setBusyId(null)
    setPending(null)
  }

  function chooseAction(listingId: string, action: ListingAction) {
    if ((CONFIRM_ACTIONS as readonly string[]).includes(action)) {
      setPending({ listingId, action: action as ConfirmAction })
      dialog.open()
      return
    }
    void runAction(listingId, action)
  }

  const counts = useMemo(
    () => tabCounts(state.listings.map((listing) => listing.status)),
    [state.listings],
  )

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR")
    return state.listings.filter((listing) => {
      if (statusGroup(listing.status) !== tab) return false
      if (normalized === "") return true
      return listing.title.toLocaleLowerCase("pt-BR").includes(normalized)
    })
  }, [state.listings, tab, query])

  const selected = filtered.find((listing) => listing.id === selectedId) ?? filtered[0] ?? null

  if (state.status === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8" aria-busy="true">
        <h1 className="text-2xl font-semibold tracking-tight">Meus anúncios</h1>
        <Skeleton className="h-12 w-full max-w-md rounded-lg" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (state.status === "signed-out") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Meus anúncios</h1>
        <AccessUnavailableState
          title="Sua sessão expirou"
          description="Entre novamente para gerenciar os seus anúncios."
          primaryAction={
            <Button variant="primary" size="sm" onPress={() => router.push("/login" as Route)}>
              Entrar
            </Button>
          }
        />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Meus anúncios</h1>
        <ErrorState
          message="Não foi possível carregar os seus anúncios agora."
          onRetry={() => void load()}
        />
      </div>
    )
  }

  const pendingCopy = pending === null ? null : CONFIRM_COPY[pending.action]

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
      {/* Mesma trilha do /mercado: alvo de 44px nos destinos (a régua mede o
          link inteiro), transição no hover e a página atual marcada com
          aria-current="page" — sem ela o nav fica sem item corrente. */}
      <nav aria-label="Trilha" className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Link
          href={"/explorar" as Route}
          className="inline-flex min-h-11 items-center transition-colors duration-[var(--semantic-motion-duration-fast)] hover:underline"
        >
          Explorar
        </Link>
        <span aria-hidden="true">›</span>
        <Link
          href={"/mercado" as Route}
          className="inline-flex min-h-11 items-center transition-colors duration-[var(--semantic-motion-duration-fast)] hover:underline"
        >
          Mercado
        </Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Meus anúncios</span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Meus anúncios</h1>
        <Button
          variant="primary"
          size="sm"
          className="min-h-11 w-fit"
          onPress={() => router.push("/mercado/novo" as Route)}
        >
          <Plus size={16} aria-hidden="true" /> Anunciar
        </Button>
      </div>

      <fieldset className="flex flex-wrap gap-2 border-b border-border">
        <legend className="sr-only">Situação dos anúncios</legend>
        {LISTING_TABS.map((entry) => {
          const active = entry.key === tab
          return (
            <button
              key={entry.key}
              type="button"
              aria-pressed={active}
              onClick={() => setTab(entry.key)}
              className={`min-h-11 rounded-t-md px-3 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus-outer)] ${
                active
                  ? "border-b-2 border-[var(--semantic-action-primary)] text-[var(--semantic-action-primary)]"
                  : "text-muted hover:text-[var(--semantic-text-primary)]"
              }`}
            >
              {entry.label} ({counts[entry.key]})
            </button>
          )
        })}
      </fieldset>

      <div className="relative w-full max-w-md">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          aria-label="Buscar nos meus anúncios"
          placeholder="Buscar nos meus anúncios"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-border bg-[var(--semantic-surface)] pl-9 pr-3 text-sm transition-colors duration-[var(--semantic-motion-duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus-outer)]"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          {filtered.length === 0 ? (
            <EmptyState
              title={
                query.trim() !== ""
                  ? "Nenhum anúncio com essa busca"
                  : tab === "active"
                    ? "Você ainda não tem anúncios aqui"
                    : "Nada nesta situação"
              }
              description={
                query.trim() !== ""
                  ? "Tente outro termo ou limpe a busca."
                  : "Publique um anúncio e ele aparece nesta lista."
              }
              action={
                query.trim() === "" ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="min-h-11"
                    onPress={() => router.push("/mercado/novo" as Route)}
                  >
                    Anunciar
                  </Button>
                ) : null
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border bg-[var(--semantic-surface)]">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <caption className="sr-only">Seus anúncios por situação</caption>
                <thead>
                  <tr className="border-b border-border text-xs text-muted">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Item
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Preço
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Público
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium">
                      Retirada
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((listing) => {
                    const actions = allowedActions(listing.status)
                    const isSelected = selected?.id === listing.id
                    return (
                      <tr
                        key={listing.id}
                        onClick={() => setSelectedId(listing.id)}
                        className={`border-b border-border align-middle transition-colors duration-[var(--semantic-motion-duration-fast)] last:border-b-0 ${
                          isSelected ? "bg-[var(--semantic-surface-sunken)]" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedId(listing.id)}
                            className="flex items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus-outer)]"
                          >
                            <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-[var(--semantic-surface-sunken)]">
                              {state.photos[listing.id] == null ? (
                                <span className="flex h-full w-full items-center justify-center text-muted">
                                  <Info size={18} aria-hidden="true" />
                                </span>
                              ) : (
                                <>
                                  {/* biome-ignore lint/performance/noImgElement: URL assinada de bucket privado; next/image não agrega aqui */}
                                  <img
                                    src={state.photos[listing.id] ?? ""}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                </>
                              )}
                            </span>
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate font-semibold">{listing.title}</span>
                              <span className="text-xs text-muted">
                                Anúncio publicado em {formatPublishedAt(listing.published_at)}
                                {" · "}
                                <span className="font-medium text-[var(--semantic-text-secondary)]">
                                  {statusLabel(listing.status)}
                                </span>
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold">
                          {formatCentsBRL(listing.price_cents)}
                        </td>
                        <td className="px-4 py-3 text-muted">{audienceLabel(listing)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">
                          {formatAvailableUntilShort(listing.available_until)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="tertiary"
                              size="sm"
                              className="min-h-11"
                              isDisabled={busyId === listing.id}
                              onPress={() => router.push(`/mercado/${listing.id}/editar` as Route)}
                            >
                              Editar
                            </Button>
                            {actions.length > 0 ? (
                              <Dropdown>
                                <Dropdown.Trigger
                                  aria-label={`Mais ações para ${listing.title}`}
                                  className="h-11 w-11 min-h-11 min-w-11 rounded-full"
                                >
                                  <MoreHorizontal size={18} aria-hidden="true" />
                                </Dropdown.Trigger>
                                <Dropdown.Popover placement="bottom end">
                                  <Dropdown.Menu
                                    aria-label="Ações do anúncio"
                                    onAction={(key) =>
                                      chooseAction(listing.id, key as ListingAction)
                                    }
                                  >
                                    {actions.map((action) => (
                                      <Dropdown.Item key={action} id={action}>
                                        {ACTION_LABELS[action]}
                                      </Dropdown.Item>
                                    ))}
                                  </Dropdown.Menu>
                                </Dropdown.Popover>
                              </Dropdown>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="w-full">
          {selected === null ? (
            <div className="rounded-2xl border border-dashed border-border bg-[var(--semantic-surface-sunken)] p-6 text-center text-sm text-muted">
              Selecione um anúncio para ver a prévia.
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-[var(--semantic-surface)] p-5">
              <h2 className="text-sm font-semibold">Prévia do anúncio selecionado</h2>
              <div className="h-44 w-full overflow-hidden rounded-xl border border-border bg-[var(--semantic-surface-sunken)]">
                {state.photos[selected.id] == null ? (
                  <div className="flex h-full w-full items-center justify-center text-muted">
                    <Info size={22} aria-hidden="true" />
                  </div>
                ) : (
                  <>
                    {/* biome-ignore lint/performance/noImgElement: URL assinada de bucket privado; next/image não agrega aqui */}
                    <img
                      src={state.photos[selected.id] ?? ""}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </>
                )}
              </div>

              <Chip size="sm" variant="soft" className={TONE_CLASS[statusTone(selected.status)]}>
                {statusLabel(selected.status)}
              </Chip>

              <div className="flex flex-col gap-1">
                <p className="text-base font-semibold">{selected.title}</p>
                <p className="text-base font-semibold text-[var(--semantic-action-primary)]">
                  {formatCentsBRL(selected.price_cents)}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <MapPin size={14} aria-hidden="true" />
                  {selected.neighborhood} · {current.cityName}
                </p>
              </div>

              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
                {selected.description}
              </p>

              <ul className="flex flex-col gap-2 border-t border-border pt-3 text-xs text-muted">
                <li className="flex items-center gap-2">
                  <Users size={14} aria-hidden="true" />
                  Público: {audienceLabel(selected)}
                </li>
                <li className="flex items-center gap-2">
                  <CalendarDays size={14} aria-hidden="true" />
                  Disponível até {formatAvailableUntilLong(selected.available_until)}
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden="true">↩</span>
                  Retirada: {pickupLabel(selected.pickup_note)}
                </li>
              </ul>

              <Link
                href={`/mercado/${selected.id}` as Route}
                className="flex min-h-11 items-center justify-center rounded-lg border border-border text-sm font-medium text-[var(--semantic-action-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus-outer)]"
              >
                Ver anúncio
              </Link>
            </div>
          )}
        </aside>
      </div>

      <p className="flex items-start gap-2 rounded-xl bg-[var(--semantic-surface-sunken)] px-4 py-3 text-xs text-muted">
        <Info size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
        Encerre o anúncio quando o item não estiver mais disponível.
      </p>

      <Modal state={dialog} onOpenChange={(isOpen) => !isOpen && setPending(null)}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{pendingCopy?.title ?? "Confirmar"}</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body>
                {pendingCopy === null ? null : <p className="text-sm">{pendingCopy.body}</p>}
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="tertiary"
                  className="min-h-11"
                  onPress={() => {
                    dialog.close()
                    setPending(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="min-h-11"
                  isDisabled={busyId !== null}
                  onPress={() => {
                    if (pending !== null) void runAction(pending.listingId, pending.action)
                  }}
                >
                  {pendingCopy?.confirm ?? "Confirmar"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  )
}
