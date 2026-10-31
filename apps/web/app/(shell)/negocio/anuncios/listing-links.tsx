"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import { Button, ButtonLink } from "../../../components/ui/button"

export type LinkableListing = {
  id: string
  title: string
  status: string
  provider_id: string | null
}
const STATUS: Record<string, string> = {
  active: "Ativo",
  draft: "Rascunho",
  paused: "Pausado",
  reserved: "Reservado",
  sold: "Vendido",
  closed: "Encerrado",
}

export function ListingLinks({
  listings,
  providerId,
  canLink,
}: {
  listings: LinkableListing[]
  providerId: string
  canLink: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  async function toggle(listing: LinkableListing) {
    setBusy(listing.id)
    setError("")
    setNotice("")
    try {
      const { data, error: updateError } = await createBrowserClient()
        .from("listings")
        .update({ provider_id: listing.provider_id ? null : providerId })
        .eq("id", listing.id)
        .select("id")
        .maybeSingle()
      if (updateError || !data) {
        setError("Não foi possível alterar o vínculo. Tente novamente.")
        return
      }
      setNotice(
        listing.provider_id ? "Anúncio desvinculado do negócio." : "Anúncio vinculado ao negócio.",
      )
      router.refresh()
    } catch {
      setError("Não foi possível alterar o vínculo. Tente novamente.")
    } finally {
      setBusy(null)
    }
  }
  return (
    <div className="space-y-4">
      {error ? <FeedbackAlert variant="danger" description={error} /> : null}
      {notice ? <FeedbackAlert variant="success" description={notice} /> : null}
      {listings.length ? (
        <ul className="divide-y divide-ui-line">
          {listings.map((listing) => (
            <li key={listing.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="font-semibold text-ui-ink [overflow-wrap:anywhere]">
                  {listing.title}
                </p>
                <p className="mt-1 text-sm text-ui-ink-2">
                  {STATUS[listing.status]} ·{" "}
                  {listing.provider_id ? "Produto do negócio" : "Anúncio pessoal"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ButtonLink href={`/mercado/${listing.id}`} variant="ghost">
                  Ver anúncio
                </ButtonLink>
                <Button
                  disabled={busy !== null || (!listing.provider_id && !canLink)}
                  onClick={() => void toggle(listing)}
                >
                  {busy === listing.id
                    ? "Salvando…"
                    : listing.provider_id
                      ? "Desvincular"
                      : "Vincular ao negócio"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ui-ink-2">
          Você ainda não tem anúncios municipais nesta cidade. Publique um produto e escolha o
          negócio como anunciante.
        </p>
      )}
      <ButtonLink href="/mercado/novo" variant="primary">
        Publicar produto
      </ButtonLink>
    </div>
  )
}
