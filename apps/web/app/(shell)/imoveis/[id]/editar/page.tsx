import { notFound } from "next/navigation"
import { getPropertyDetail, signPhotoPaths } from "../../../../../lib/listings/queries"
import { createListingClient } from "../../../../../lib/listings/ssr-client"
import type { PropertyDraftInput } from "../../../../../lib/listings/validation"
import { PropertyForm } from "../../property-form"

// RECON-027 — /imoveis/[id]/editar. Mesma autorização do ciclo do Mercado: só
// o dono edita. O público aparece travado (prancha 64: "não é possível alterar").

function centsToInput(cents: number | null): string {
  return cents === null ? "" : String(Math.round(cents / 100))
}

export default async function EditarImovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await createListingClient()
  const {
    data: { user },
  } = await client.auth.getUser()
  if (user === null) {
    throw new Error("Sessão ausente para editar um imóvel.")
  }

  const property = await getPropertyDetail(client, id)
  if (property === null || property.ownerUserId !== user.id) {
    notFound()
  }

  const signed = await signPhotoPaths(
    client,
    property.photos.map((photo) => photo.path),
  )
  const existingPhotos = property.photos.map((photo) => ({
    id: photo.id,
    path: photo.path,
    url: signed.get(photo.path) ?? null,
  }))

  const defaults: PropertyDraftInput = {
    title: property.title,
    deal: property.deal,
    propertyType: property.propertyType,
    rent: centsToInput(property.rentCents),
    condoFee: centsToInput(property.condoFeeCents),
    iptu: centsToInput(property.iptuCents),
    salePrice: centsToInput(property.salePriceCents),
    bedrooms: property.bedrooms === null ? "" : String(property.bedrooms),
    suites: property.suites === null ? "" : String(property.suites),
    parkingSpots: property.parkingSpots === null ? "" : String(property.parkingSpots),
    areaM2: property.areaM2 === null ? "" : String(property.areaM2),
    description: property.description ?? "",
    neighborhood: property.neighborhood ?? "",
    availableFrom: property.availableFrom ?? "",
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Editar anúncio</h1>
      <p className="mt-1 text-sm text-muted">Alterações aparecem na ficha assim que salvas.</p>
      <div className="mt-6">
        <PropertyForm
          mode="edit"
          listingId={property.id}
          localityId=""
          cityLabel=""
          communities={[]}
          audience={{ kind: "locality", label: property.audienceLabel }}
          defaults={defaults}
          existingPhotos={existingPhotos}
        />
      </div>
    </div>
  )
}
