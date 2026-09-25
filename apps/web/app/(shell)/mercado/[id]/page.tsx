"use client"

import { Button, Chip } from "@heroui/react"
import { ArrowLeft, MapPin } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { categoryLabel, conditionLabel, formatCentsBRL } from "../../../../lib/listings/catalog"
import { listingsClient } from "../../../../lib/listings/client"
import { MemberAvatar } from "../../../components/bivaque/avatar"
import { AccessUnavailableState, EmptyState } from "../../../components/bivaque/empty-state"
import { ErrorState } from "../../../components/bivaque/error-state"
import { Skeleton } from "../../../components/bivaque/skeleton"
import { showToast } from "../../../components/bivaque/toast"
import { type ListingPhotoRow, type ListingRow, SaveButton } from "../mercado-shared"

interface Advertiser {
  displayName: string
}

interface DetailState {
  status: "loading" | "ready" | "error" | "unavailable"
  listing: ListingRow | null
  photos: { path: string; url: string }[]
  advertiser: Advertiser
  communityName: string | null
  isOwner: boolean
  saved: boolean
}

const INITIAL_STATE: DetailState = {
  status: "loading",
  listing: null,
  photos: [],
  advertiser: { displayName: "Anunciante" },
  communityName: null,
  isOwner: false,
  saved: false,
}

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>()
  const listingId = params.id
  const router = useRouter()
  const [state, setState] = useState<DetailState>(INITIAL_STATE)
  const [activePhoto, setActivePhoto] = useState(0)
  const [opening, setOpening] = useState(false)

  const load = useCallback(async () => {
    setState(INITIAL_STATE)
    const supabase = listingsClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from("listings")
      .select(
        "id,owner_user_id,title,description,category,price_cents,condition,neighborhood,address,status,locality_id,community_id,created_at",
      )
      .eq("id", listingId)
      .maybeSingle()

    if (error) {
      setState((previous) => ({ ...previous, status: "error" }))
      return
    }
    if (data === null) {
      setState((previous) => ({ ...previous, status: "unavailable" }))
      return
    }

    const listing = data as ListingRow
    const isOwner = user !== null && user.id === listing.owner_user_id

    const { data: photoRows } = await supabase
      .from("listing_photos")
      .select("listing_id,path,position")
      .eq("listing_id", listing.id)
      .order("position", { ascending: true })

    const orderedPaths = ((photoRows ?? []) as ListingPhotoRow[]).map((photo) => photo.path)
    let photos: { path: string; url: string }[] = []
    if (orderedPaths.length > 0) {
      const { data: signed } = await supabase.storage
        .from("listing-photos")
        .createSignedUrls(orderedPaths, 3600)
      const urlByPath = new Map<string, string>()
      for (const entry of signed ?? []) {
        if (entry.path !== null && entry.signedUrl !== null) {
          urlByPath.set(entry.path, entry.signedUrl)
        }
      }
      photos = orderedPaths
        .map((path) => ({ path, url: urlByPath.get(path) ?? "" }))
        .filter((photo) => photo.url !== "")
    }

    let advertiser: Advertiser = { displayName: "Anunciante" }
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", listing.owner_user_id)
      .maybeSingle()
    if (profile !== null) {
      advertiser = { displayName: (profile as { display_name: string }).display_name }
    }

    let communityName: string | null = null
    if (listing.community_id !== null) {
      const { data: community } = await supabase
        .from("communities")
        .select("name")
        .eq("id", listing.community_id)
        .maybeSingle()
      communityName = community === null ? null : (community as { name: string }).name
    }

    let saved = false
    if (user !== null) {
      const { data: saveRow } = await supabase
        .from("listing_saves")
        .select("listing_id")
        .eq("listing_id", listing.id)
        .eq("user_id", user.id)
        .maybeSingle()
      saved = saveRow !== null
    }

    setState({
      status: "ready",
      listing,
      photos,
      advertiser,
      communityName,
      isOwner,
      saved,
    })
  }, [listingId])

  useEffect(() => {
    void load()
  }, [load])

  async function expressInterest() {
    if (state.listing === null || opening) return
    setOpening(true)
    const supabase = listingsClient()
    const { data, error } = await supabase.rpc("open_conversation", {
      p_other_user_id: state.listing.owner_user_id,
      p_context_type: "listing",
      p_context_id: state.listing.id,
    })
    if (error) {
      showToast({
        title: "Não foi possível abrir a conversa",
        description: "Tente novamente em instantes.",
        variant: "danger",
      })
      setOpening(false)
      return
    }
    router.push(`/messages?conversation=${data}` as Route)
  }

  if (state.status === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8" aria-busy="true">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <ErrorState
          message="Não foi possível carregar este anúncio agora."
          onRetry={() => void load()}
        />
      </div>
    )
  }

  if (state.status === "unavailable" || state.listing === null) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <AccessUnavailableState
          title="Anúncio indisponível"
          description="Ele pode ter sido pausado, encerrado ou estar fora do seu alcance."
          primaryAction={
            <Button variant="primary" size="sm" onPress={() => router.push("/mercado" as Route)}>
              Voltar para o Mercado
            </Button>
          }
        />
      </div>
    )
  }

  const listing = state.listing
  const currentPhoto = state.photos[activePhoto]?.url ?? null

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <Link
        href={"/mercado" as Route}
        className="flex w-fit items-center gap-1.5 text-sm text-muted hover:text-[var(--semantic-text-primary)]"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar para resultados
      </Link>

      <nav aria-label="Trilha" className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Link href={"/explorar" as Route} className="hover:underline">
          Explorar
        </Link>
        <span aria-hidden="true">›</span>
        <span>{categoryLabel(listing.category)}</span>
        <span aria-hidden="true">›</span>
        <span className="truncate">{listing.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="h-80 w-full overflow-hidden rounded-2xl border border-border bg-[var(--semantic-surface-sunken)]">
            {currentPhoto === null ? (
              <EmptyState
                title="Sem foto"
                description="O anunciante não adicionou imagens a este anúncio."
                className="h-full"
              />
            ) : (
              <>
                {/* biome-ignore lint/performance/noImgElement: URL assinada de bucket privado; next/image reprocessaria sem ganho */}
                <img
                  src={currentPhoto}
                  alt={`Foto de ${listing.title}`}
                  className="h-full w-full object-cover"
                />
              </>
            )}
          </div>
          {state.photos.length > 1 ? (
            <ul className="flex flex-wrap gap-2">
              {state.photos.map((photo, index) => (
                <li key={photo.path}>
                  <button
                    type="button"
                    aria-label={`Ver foto ${index + 1}`}
                    aria-current={index === activePhoto ? "true" : undefined}
                    onClick={() => setActivePhoto(index)}
                    className={`h-16 w-16 overflow-hidden rounded-lg border ${
                      index === activePhoto
                        ? "border-[var(--semantic-action-primary)]"
                        : "border-border"
                    }`}
                  >
                    {/* biome-ignore lint/performance/noImgElement: miniatura de URL assinada; sem ganho com otimização */}
                    <img src={photo.url} alt="" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{listing.title}</h1>
            <p className="text-2xl font-semibold text-[var(--semantic-action-primary)]">
              {formatCentsBRL(listing.price_cents)}
            </p>
            <p className="text-sm text-muted">{conditionLabel(listing.condition)}</p>
            <p className="flex items-center gap-1.5 text-sm text-muted">
              <MapPin size={15} aria-hidden="true" />
              {listing.neighborhood}
            </p>
            {/* Endereço por escolha de quem anuncia (migration 20260925174442). */}
            {listing.address ? (
              <p className="text-sm text-[var(--semantic-text-primary)]">
                <span className="text-muted">Endereço: </span>
                {listing.address}
              </p>
            ) : null}
          </div>

          <div className="border-t border-border pt-4">
            <h2 className="mb-1.5 text-sm font-semibold">Descrição</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
              {listing.description}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-[var(--semantic-surface)] p-4">
            <MemberAvatar name={state.advertiser.displayName} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{state.advertiser.displayName}</p>
              <p className="text-xs text-muted">
                {state.communityName === null
                  ? "Membro da cidade"
                  : `Membro da comunidade · ${state.communityName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {state.isOwner ? (
              <div className="flex flex-1 flex-col gap-1">
                <Button variant="primary" size="md" isDisabled className="min-h-11 w-full">
                  Tenho interesse
                </Button>
                <p className="text-xs text-muted">
                  Este anúncio é seu. Você não conversa consigo mesmo por aqui.
                </p>
              </div>
            ) : listing.status !== "active" ? (
              <div className="flex flex-1 flex-col gap-1">
                <Button variant="primary" size="md" isDisabled className="min-h-11 w-full">
                  Tenho interesse
                </Button>
                <p className="text-xs text-muted">Este anúncio não está mais ativo.</p>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                className="min-h-11 flex-1"
                isDisabled={opening}
                onPress={expressInterest}
              >
                {opening ? "Abrindo…" : "Tenho interesse"}
              </Button>
            )}
            <SaveButton
              listingId={listing.id}
              saved={state.saved}
              onSavedChange={(saved) => setState((previous) => ({ ...previous, saved }))}
            />
          </div>

          {state.isOwner ? (
            <Chip size="sm" variant="soft" className="w-fit">
              {listing.status === "draft" ? "Rascunho" : "Seu anúncio"}
            </Chip>
          ) : null}
        </div>
      </div>
    </div>
  )
}
