"use client"

import { ImagePlus, X } from "lucide-react"
import type { Route } from "next"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import {
  createPropertyAction,
  removeListingPhotoAction,
  updatePropertyAction,
  uploadPropertyPhotoAction,
} from "../../../lib/listings/actions"
import { ADDRESS_HINT, ADDRESS_MAX } from "../../../lib/listings/address"
import {
  MAX_LISTING_PHOTOS,
  PROPERTY_TYPE_LABELS,
  type PropertyType,
} from "../../../lib/listings/types"
import type { PropertyDraftInput } from "../../../lib/listings/validation"
import { runWithPending, uploadPhotosOneByOne } from "../../../lib/storage/photo-upload-sequence"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"

// Redesenha a imagem em canvas antes de enviar. O navegador não copia os
// metadados EXIF nesse processo, então a coordenada de câmera não chega ao
// servidor (ADR de mídia, D5). Mesmo mecanismo da foto de evento.
async function stripExifToJpeg(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext("2d")
  if (!context) return file
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  )
  if (!blob) return file
  const baseName = file.name.replace(/\.[^.]+$/, "")
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" })
}

export interface ExistingPhoto {
  id: string
  path: string
  url: string | null
}

interface PropertyFormProps {
  mode: "create" | "edit"
  listingId?: string
  localityId: string
  cityLabel: string
  communities: { id: string; name: string }[]
  audience: { kind: "locality"; label: string } | { kind: "community"; label: string }
  defaults: PropertyDraftInput
  existingPhotos?: ExistingPhoto[]
}

const fieldClass =
  "mt-1 min-h-11 w-full rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-instant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
const labelClass = "block text-sm font-medium"

export function PropertyForm({
  mode,
  listingId,
  localityId,
  cityLabel,
  communities,
  audience,
  defaults,
  existingPhotos = [],
}: PropertyFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [deal, setDeal] = useState<"rent" | "sale">(defaults.deal === "sale" ? "sale" : "rent")
  const [audienceValue, setAudienceValue] = useState<string>(
    audience.kind === "locality" ? `locality:${localityId}` : "keep",
  )
  const [photos, setPhotos] = useState<File[]>([])
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [existing, setExisting] = useState<ExistingPhoto[]>(existingPhotos)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [submitting, setSubmitting] = useState(false)

  async function onPick(files: FileList | null) {
    if (!files) return
    const room = MAX_LISTING_PHOTOS - existing.length - photos.length
    const chosen = Array.from(files).slice(0, Math.max(room, 0))
    const converted: File[] = []
    for (const file of chosen) {
      converted.push(await stripExifToJpeg(file))
    }
    setPhotos((current) => [...current, ...converted])
    setPhotoUrls((current) => [...current, ...converted.map((file) => URL.createObjectURL(file))])
  }

  function removeNew(index: number) {
    setPhotos((current) => current.filter((_, position) => position !== index))
    setPhotoUrls((current) => current.filter((_, position) => position !== index))
  }

  function removeExisting(photo: ExistingPhoto) {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("listingId", listingId ?? "")
      formData.set("path", photo.path)
      const result = await removeListingPhotoAction(formData)
      if (result.ok) {
        setExisting((current) => current.filter((item) => item.id !== photo.id))
      } else {
        setError(result.message ?? "Não foi possível remover a foto.")
      }
    })
  }

  async function submit(intent: "publish" | "draft") {
    const form = formRef.current
    if (!form || submitting) return
    const formData = new FormData(form)
    formData.set("intent", intent)
    if (mode === "edit" && listingId) formData.set("listingId", listingId)
    // SEC-006 (revisão M2): nenhuma foto entra no corpo do anúncio. Cada uma
    // vai numa chamada própria, com o anúncio já criado, para não estourar o
    // `bodySizeLimit` de 12 MB. O registro (listings + property_details)
    // continua sendo criado junto, antes das fotos.
    formData.delete("photos")
    const chosen = photos

    const outcome = await runWithPending(
      setSubmitting,
      async () => {
        const saved =
          mode === "create"
            ? await createPropertyAction(formData)
            : await updatePropertyAction(formData)
        if (!saved.ok) {
          return {
            ok: false as const,
            message: saved.message ?? "Não foi possível salvar agora.",
          }
        }
        const id = mode === "create" ? saved.listingId : listingId
        if (id === undefined || id === "") {
          return { ok: false as const, message: "Não foi possível identificar o anúncio salvo." }
        }

        const batch = await uploadPhotosOneByOne(chosen, async (photo, index) => {
          const photoForm = new FormData()
          photoForm.set("listingId", id)
          photoForm.set("position", String(existing.length + index))
          photoForm.set("photo", photo)
          return await uploadPropertyPhotoAction(photoForm)
        })
        return { ok: true as const, id, failures: batch.failures }
      },
      "Não foi possível salvar agora. Tente de novo em instantes.",
    )

    if (!outcome.ok) {
      setError(outcome.message)
      return
    }
    if (!outcome.value.ok) {
      setError(outcome.value.message)
      return
    }
    if (outcome.value.failures.length > 0) {
      const count = outcome.value.failures.length
      setError(
        count === 1
          ? "O anúncio foi salvo, mas uma foto não pôde ser enviada. Abra o anúncio em Meus imóveis para tentar novamente."
          : `O anúncio foi salvo, mas ${count} fotos não puderam ser enviadas. Abra o anúncio em Meus imóveis para tentar novamente.`,
      )
      return
    }

    router.push(`/imoveis/${outcome.value.id}` as Route)
  }

  const editingAudience = mode === "edit" ? audience.label : null

  return (
    <form ref={formRef} className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      {error ? (
        <FeedbackAlert variant="danger" title="Não foi possível salvar" description={error} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <label className={labelClass}>
            Título do anúncio
            <input
              name="title"
              required
              defaultValue={defaults.title}
              maxLength={120}
              className={fieldClass}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Negócio
              <select
                name="deal"
                value={deal}
                onChange={(event) => setDeal(event.target.value === "sale" ? "sale" : "rent")}
                className={fieldClass}
              >
                <option value="rent">Aluguel</option>
                <option value="sale">Venda</option>
              </select>
            </label>
            <label className={labelClass}>
              Tipo do imóvel
              <select
                name="propertyType"
                defaultValue={defaults.propertyType}
                className={fieldClass}
              >
                {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((type) => (
                  <option key={type} value={type}>
                    {PROPERTY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {deal === "rent" ? (
              <>
                <label className={labelClass}>
                  Aluguel (R$)
                  <input
                    name="rent"
                    inputMode="numeric"
                    defaultValue={defaults.rent}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Condomínio (R$, opcional)
                  <input
                    name="condoFee"
                    inputMode="numeric"
                    defaultValue={defaults.condoFee}
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  IPTU (R$, opcional)
                  <input
                    name="iptu"
                    inputMode="numeric"
                    defaultValue={defaults.iptu}
                    className={fieldClass}
                  />
                </label>
                <input type="hidden" name="salePrice" value="" />
              </>
            ) : (
              <>
                <label className={labelClass}>
                  Preço de venda (R$)
                  <input
                    name="salePrice"
                    inputMode="numeric"
                    defaultValue={defaults.salePrice}
                    className={fieldClass}
                  />
                </label>
                <input type="hidden" name="rent" value="" />
                <input type="hidden" name="condoFee" value={defaults.condoFee} />
                <input type="hidden" name="iptu" value={defaults.iptu} />
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className={labelClass}>
              Quartos
              <input
                name="bedrooms"
                inputMode="numeric"
                defaultValue={defaults.bedrooms}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              Suítes
              <input
                name="suites"
                inputMode="numeric"
                defaultValue={defaults.suites}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              Vagas
              <input
                name="parkingSpots"
                inputMode="numeric"
                defaultValue={defaults.parkingSpots}
                className={fieldClass}
              />
            </label>
          </div>

          <label className={labelClass}>
            Área privativa (m²)
            <input
              name="areaM2"
              inputMode="decimal"
              defaultValue={defaults.areaM2}
              className={fieldClass}
            />
          </label>

          <label className={labelClass}>
            Descrição
            <textarea
              name="description"
              rows={4}
              defaultValue={defaults.description}
              className={fieldClass}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Disponível a partir de
              <input
                type="date"
                name="availableFrom"
                defaultValue={defaults.availableFrom}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              Bairro
              <input
                name="neighborhood"
                defaultValue={defaults.neighborhood}
                className={fieldClass}
              />
            </label>
            <label className={`${labelClass} col-span-2`}>
              <span>
                Endereço <span className="font-normal text-muted">(opcional)</span>
              </span>
              <input
                name="address"
                defaultValue={defaults.address ?? ""}
                maxLength={ADDRESS_MAX}
                autoComplete="street-address"
                aria-describedby="imovel-endereco-ajuda"
                className={fieldClass}
              />
              <span id="imovel-endereco-ajuda" className="text-xs font-normal text-muted">
                {ADDRESS_HINT}
              </span>
            </label>
          </div>

          {editingAudience === null ? (
            <fieldset className="space-y-2">
              <legend className={labelClass}>Público permitido</legend>
              <select
                value={audienceValue}
                onChange={(event) => setAudienceValue(event.target.value)}
                className={fieldClass}
              >
                <option value={`locality:${localityId}`}>Toda a cidade — {cityLabel}</option>
                {communities.map((community) => (
                  <option key={community.id} value={`community:${community.id}`}>
                    Comunidade — {community.name}
                  </option>
                ))}
              </select>
              <input
                type="hidden"
                name="localityId"
                value={
                  audienceValue.startsWith("locality:")
                    ? audienceValue.slice("locality:".length)
                    : ""
                }
              />
              <input
                type="hidden"
                name="communityId"
                value={
                  audienceValue.startsWith("community:")
                    ? audienceValue.slice("community:".length)
                    : ""
                }
              />
              <p className="text-xs text-muted">
                O anúncio será visível apenas para quem alcança este público. Não é possível alterar
                depois de publicado.
              </p>
            </fieldset>
          ) : (
            <div className={labelClass}>
              Público permitido
              <p className="mt-1 flex min-h-11 items-center rounded-lg border border-border bg-[var(--paper)] px-3 text-sm text-muted">
                {editingAudience} — não é possível alterar
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <p className={labelClass}>Fotos do imóvel</p>
          <p className="text-xs text-muted">Adicione fotos reais do imóvel.</p>
          <ul className="grid grid-cols-3 gap-2">
            {existing.map((photo) => (
              <li key={photo.id} className="relative">
                {photo.url ? (
                  // biome-ignore lint/performance/noImgElement: URL assinada de bucket privado expira; o otimizador cachearia link volátil.
                  <img
                    src={photo.url}
                    alt="Foto do imóvel"
                    className="aspect-square w-full rounded-md border border-border object-cover"
                  />
                ) : (
                  <div
                    role="img"
                    aria-label="Foto indisponível"
                    className="aspect-square w-full rounded-md border border-border bg-[var(--paper)]"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeExisting(photo)}
                  aria-label="Remover foto"
                  className="absolute top-1 right-1 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[var(--semantic-surface)]"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
            {photoUrls.map((url, index) => (
              <li key={url} className="relative">
                {/* biome-ignore lint/performance/noImgElement: pré-visualização local de blob, ainda não enviada. */}
                <img
                  src={url}
                  alt="Pré-visualização da foto"
                  className="aspect-square w-full rounded-md border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeNew(index)}
                  aria-label="Remover foto"
                  className="absolute top-1 right-1 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[var(--semantic-surface)]"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
            {existing.length + photos.length < MAX_LISTING_PHOTOS ? (
              <li>
                <label className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)]">
                  <ImagePlus size={18} aria-hidden="true" />
                  Adicionar foto
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      void onPick(event.target.files)
                      event.target.value = ""
                    }}
                  />
                </label>
              </li>
            ) : null}
          </ul>
          <p className="text-xs text-muted">
            Você pode adicionar até {MAX_LISTING_PHOTOS} fotos. JPG, PNG ou WebP até 10MB.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        {mode === "create" ? (
          <>
            <button
              type="button"
              disabled={pending || submitting}
              onClick={() => void submit("draft")}
              className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] disabled:opacity-60"
            >
              Salvar rascunho
            </button>
            <button
              type="button"
              disabled={pending || submitting}
              onClick={() => void submit("publish")}
              className="min-h-11 rounded-lg bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors duration-[var(--semantic-motion-duration-instant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] disabled:opacity-60"
            >
              Publicar anúncio
            </button>
          </>
        ) : (
          <>
            <a
              href={listingId ? `/imoveis/${listingId}` : "/imoveis"}
              className="flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)]"
            >
              Cancelar
            </a>
            <button
              type="button"
              disabled={pending || submitting}
              onClick={() => void submit("publish")}
              className="min-h-11 rounded-lg bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors duration-[var(--semantic-motion-duration-instant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] disabled:opacity-60"
            >
              Salvar alterações
            </button>
          </>
        )}
      </div>
    </form>
  )
}
