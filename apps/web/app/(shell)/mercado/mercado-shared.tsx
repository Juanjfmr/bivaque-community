"use client"

import { Button } from "@heroui/react"
import { Bookmark, MapPin } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useState } from "react"
import { formatCentsBRL, relativeTime } from "../../../lib/listings/catalog"
import { listingsClient } from "../../../lib/listings/client"
import { showToast } from "../../components/bivaque/toast"

export interface ListingRow {
  id: string
  owner_user_id: string
  title: string
  description: string
  category: string
  price_cents: number
  condition: string
  neighborhood: string
  status: string
  locality_id: string | null
  community_id: string | null
  created_at: string
}

export interface ListingPhotoRow {
  listing_id: string
  path: string
  position: number
}

// O botão de salvar é persistência real em `listing_saves` (RLS: dona é a
// pessoa). Otimista com reversão — nunca um toast como única implementação.
export function SaveButton({
  listingId,
  saved,
  onSavedChange,
}: {
  listingId: string
  saved: boolean
  onSavedChange?: (saved: boolean) => void
}) {
  const [isSaved, setIsSaved] = useState(saved)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (busy) return
    setBusy(true)
    const supabase = listingsClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user === null) {
      showToast({ title: "Entre para salvar", variant: "warning" })
      setBusy(false)
      return
    }
    const next = !isSaved
    setIsSaved(next)
    const { error } = next
      ? await supabase.from("listing_saves").insert({ listing_id: listingId, user_id: user.id })
      : await supabase
          .from("listing_saves")
          .delete()
          .eq("listing_id", listingId)
          .eq("user_id", user.id)
    if (error) {
      setIsSaved(!next)
      showToast({
        title: "Não foi possível salvar",
        description: "Tente novamente em instantes.",
        variant: "danger",
      })
      setBusy(false)
      return
    }
    onSavedChange?.(next)
    setBusy(false)
  }

  return (
    <Button
      variant={isSaved ? "primary" : "tertiary"}
      size="sm"
      aria-label={isSaved ? "Remover dos salvos" : "Salvar anúncio"}
      isDisabled={busy}
      onPress={toggle}
      className="h-11 w-11 min-w-11 rounded-full p-0"
    >
      <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} aria-hidden="true" />
    </Button>
  )
}

function PhotoPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--semantic-surface-sunken)] text-muted">
      <Bookmark size={28} aria-hidden="true" />
    </div>
  )
}

export function ListingCard({
  listing,
  photoUrl,
  saved,
}: {
  listing: ListingRow
  photoUrl: string | null
  saved: boolean
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-[var(--semantic-surface)] transition-shadow duration-[var(--semantic-motion-duration-base)] hover:shadow-[var(--semantic-elevation-raised)]">
      <Link
        href={`/mercado/${listing.id}` as Route}
        className="flex h-full flex-col transition-colors duration-[var(--semantic-motion-duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
      >
        <div className="h-40 w-full overflow-hidden">
          {photoUrl === null ? (
            <PhotoPlaceholder />
          ) : (
            <>
              {/* biome-ignore lint/performance/noImgElement: URL assinada de bucket privado; sem ganho com otimização */}
              <img
                src={photoUrl}
                alt=""
                className="h-40 w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <h2 className="text-base font-semibold tracking-tight">{listing.title}</h2>
          <p className="text-base font-semibold text-[var(--semantic-action-primary)]">
            {formatCentsBRL(listing.price_cents)}
          </p>
          <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted">
            <span className="flex min-w-0 items-center gap-1">
              <MapPin size={14} aria-hidden="true" />
              <span className="truncate">{listing.neighborhood}</span>
            </span>
            <span className="shrink-0">{relativeTime(listing.created_at)}</span>
          </div>
        </div>
      </Link>
      <div className="absolute right-2 top-2 z-10">
        <SaveButton listingId={listing.id} saved={saved} />
      </div>
    </div>
  )
}

export const LISTING_PHOTO_BUCKET = "listing-photos"
