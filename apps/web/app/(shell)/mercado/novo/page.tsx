"use client"

import { Button, Chip } from "@heroui/react"
import { ArrowLeft, Camera, X } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useRef, useState } from "react"
import { ADDRESS_HINT, ADDRESS_MAX } from "../../../../lib/listings/address"
import {
  buildListingPhotoPath,
  LISTING_CATEGORIES,
  LISTING_CONDITIONS,
  MAX_LISTING_PHOTOS,
  type NewListingErrors,
  validateNewListing,
} from "../../../../lib/listings/catalog"
import { listingsClient } from "../../../../lib/listings/client"
import { useLocalityContext } from "../../../../lib/locality-context"
import { useMemberContext } from "../../../../lib/member-context"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_BYTES = 10 * 1024 * 1024

// Chaves estáveis por slot: a grade é fixa (3×2).
const PHOTO_SLOT_KEYS = Array.from({ length: MAX_LISTING_PHOTOS }, (_, slot) => `foto-slot-${slot}`)

interface PendingPhoto {
  blob: Blob
  previewUrl: string
}

// Reencodar no canvas remove o EXIF (inclusive coordenada de câmera) — o mesmo
// contrato do upload de publicação. O servidor ainda valida tipo e tamanho.
async function stripExif(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext("2d")
  if (context === null) throw new Error("canvas indisponível")
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) reject(new Error("não foi possível processar a imagem"))
        else resolve(blob)
      },
      "image/jpeg",
      0.9,
    )
  })
}

export default function NovoAnuncioPage() {
  const router = useRouter()
  const { current } = useLocalityContext()
  const { communities } = useMemberContext()

  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [price, setPrice] = useState("")
  const [condition, setCondition] = useState("used")
  const [description, setDescription] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [address, setAddress] = useState("")
  const [audienceKey, setAudienceKey] = useState("locality")
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [errors, setErrors] = useState<NewListingErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const audienceOptions = useMemo(
    () => [
      { key: "locality", label: `Toda a cidade — ${current.cityName}` },
      ...communities.map((community) => ({
        key: `community:${community.id}`,
        label: community.name,
      })),
    ],
    [communities, current.cityName],
  )

  const selectedCommunity = audienceKey.startsWith("community:")
    ? audienceKey.slice("community:".length)
    : null
  const audienceLabel =
    audienceOptions.find((option) => option.key === audienceKey)?.label ?? current.cityName

  async function addFiles(fileList: FileList | null) {
    if (fileList === null) return
    const incoming = Array.from(fileList)
    const accepted: PendingPhoto[] = []
    for (const file of incoming) {
      if (photos.length + accepted.length >= MAX_LISTING_PHOTOS) break
      if (!ALLOWED_TYPES.includes(file.type)) continue
      if (file.size > MAX_FILE_BYTES) continue
      try {
        const blob = await stripExif(file)
        accepted.push({ blob, previewUrl: URL.createObjectURL(blob) })
      } catch {
        // Arquivo ilegível é ignorado; a pessoa pode escolher outro.
      }
    }
    if (accepted.length > 0) setPhotos((previous) => [...previous, ...accepted])
  }

  function removePhoto(index: number) {
    setPhotos((previous) => {
      const next = [...previous]
      const [removed] = next.splice(index, 1)
      if (removed !== undefined) URL.revokeObjectURL(removed.previewUrl)
      return next
    })
  }

  async function submit(publish: boolean) {
    setSubmitError(null)
    const validation = validateNewListing({
      title,
      category,
      priceInput: price,
      condition,
      description,
      neighborhood,
      address,
      audienceType: selectedCommunity === null ? "locality" : "community",
      localityId: selectedCommunity === null ? current.id : null,
      communityId: selectedCommunity,
      photoCount: photos.length,
    })
    if (!validation.ok) {
      setErrors(validation.errors)
      return
    }
    setErrors({})
    setSubmitting(true)

    const supabase = listingsClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user === null) {
      setSubmitError("Sua sessão expirou. Entre novamente para publicar.")
      setSubmitting(false)
      return
    }

    const value = validation.value
    const { data: inserted, error: insertError } = await supabase
      .from("listings")
      .insert({
        owner_user_id: user.id,
        kind: "item",
        status: publish ? "active" : "draft",
        locality_id: value.localityId,
        community_id: value.communityId,
        category: value.category,
        title: value.title,
        description: value.description,
        price_cents: value.priceCents,
        condition: value.condition,
        neighborhood: value.neighborhood,
        address: value.address,
        published_at: publish ? new Date().toISOString() : null,
      })
      .select("id")
      .single()

    if (insertError || inserted === null) {
      setSubmitError("Não foi possível salvar o anúncio. Suas informações continuam aqui.")
      setSubmitting(false)
      return
    }

    const listingId = (inserted as { id: string }).id
    const uploaded: string[] = []
    try {
      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index]
        if (photo === undefined) continue
        const path = buildListingPhotoPath(listingId, index, photo.blob.type)
        const { error: uploadError } = await supabase.storage
          .from("listing-photos")
          .upload(path, photo.blob, { contentType: photo.blob.type, upsert: false })
        if (uploadError) throw new Error(uploadError.message)
        uploaded.push(path)
      }
      if (uploaded.length > 0) {
        const { error: photoError } = await supabase.from("listing_photos").insert(
          uploaded.map((path, index) => ({
            listing_id: listingId,
            path,
            position: index,
          })),
        )
        if (photoError) throw new Error(photoError.message)
      }
      router.push(`/mercado/${listingId}` as Route)
    } catch {
      // Nada de objeto órfão alcançável: desfaz o que subiu e mantém o rascunho.
      if (uploaded.length > 0) {
        await supabase.storage.from("listing-photos").remove(uploaded)
      }
      setSubmitError(
        publish
          ? "Não foi possível publicar as fotos. Suas informações continuam aqui; tente novamente."
          : "Não foi possível salvar as fotos. Suas informações continuam aqui; tente novamente.",
      )
      setSubmitting(false)
    }
  }

  const fieldError = (key: keyof NewListingErrors) =>
    errors[key] === undefined ? null : (
      <p className="text-xs text-[var(--semantic-feedback-danger)]">{errors[key]}</p>
    )

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <Link
        href={"/mercado" as Route}
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-muted transition-colors duration-[var(--semantic-motion-duration-fast)] hover:text-[var(--semantic-text-primary)]"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Novo anúncio</h1>
      <p className="-mt-4 text-sm text-muted">
        Vende com frequência?{" "}
        <Link
          href={"/negocio" as Route}
          className="inline-flex min-h-11 items-center font-medium text-[var(--semantic-action-primary)] underline transition-colors"
        >
          Crie a página do seu negócio
        </Link>{" "}
        para reunir o que você oferece.
      </p>

      {submitError ? <FeedbackAlert variant="danger" description={submitError} /> : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="anuncio-titulo" className="text-sm font-medium">
              Título do anúncio
            </label>
            <input
              id="anuncio-titulo"
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              className="min-h-11 rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-fast)]"
            />
            {fieldError("title")}
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="anuncio-categoria" className="text-sm font-medium">
                Categoria
              </label>
              <select
                id="anuncio-categoria"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="min-h-11 rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-fast)]"
              >
                <option value="">Escolha</option>
                {LISTING_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {fieldError("category")}
            </div>

            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="anuncio-preco" className="text-sm font-medium">
                Preço (R$)
              </label>
              <input
                id="anuncio-preco"
                value={price}
                inputMode="decimal"
                placeholder="650,00"
                onChange={(event) => setPrice(event.target.value)}
                className="min-h-11 rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-fast)]"
              />
              {fieldError("price")}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="anuncio-condicao" className="text-sm font-medium">
              Condição
            </label>
            <select
              id="anuncio-condicao"
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              className="min-h-11 rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-fast)]"
            >
              {LISTING_CONDITIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {fieldError("condition")}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="anuncio-descricao" className="text-sm font-medium">
              Descrição
            </label>
            <textarea
              id="anuncio-descricao"
              value={description}
              rows={3}
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
              className="rounded-lg border border-border bg-[var(--semantic-surface)] px-3 py-2 text-sm transition-colors duration-[var(--semantic-motion-duration-fast)]"
            />
            {fieldError("description")}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="anuncio-bairro" className="text-sm font-medium">
              Bairro
            </label>
            <input
              id="anuncio-bairro"
              value={neighborhood}
              maxLength={80}
              onChange={(event) => setNeighborhood(event.target.value)}
              className="min-h-11 rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-fast)]"
            />
            <p className="text-xs text-muted">Só o bairro. O endereço vem no campo abaixo.</p>
            {fieldError("neighborhood")}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="anuncio-endereco" className="text-sm font-medium">
              Endereço <span className="font-normal text-muted">(opcional)</span>
            </label>
            <input
              id="anuncio-endereco"
              value={address}
              maxLength={ADDRESS_MAX}
              autoComplete="street-address"
              onChange={(event) => setAddress(event.target.value)}
              className="min-h-11 rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-fast)]"
            />
            <p className="text-xs text-muted">{ADDRESS_HINT}</p>
            {fieldError("address")}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="anuncio-publico" className="text-sm font-medium">
              Público permitido
            </label>
            <select
              id="anuncio-publico"
              value={audienceKey}
              onChange={(event) => setAudienceKey(event.target.value)}
              className="min-h-11 rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-fast)]"
            >
              {audienceOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            <Chip size="sm" variant="soft" className="w-fit">
              {audienceLabel}
            </Chip>
            <p className="text-xs text-muted">
              {selectedCommunity === null
                ? `Seu anúncio será visível para membros de ${current.cityName}.`
                : "Seu anúncio será visível apenas para membros desta comunidade."}
            </p>
            {fieldError("audience")}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Fotos do anúncio</span>
            <p className="text-xs text-muted">Adicione fotos reais do item.</p>
          </div>

          <ul className="grid grid-cols-3 gap-2">
            {PHOTO_SLOT_KEYS.map((slotKey, index) => {
              const photo = photos[index]
              if (photo !== undefined) {
                return (
                  <li key={photo.previewUrl} className="relative aspect-square">
                    {/* biome-ignore lint/performance/noImgElement: prévia local (blob URL); não há rede a otimizar */}
                    <img
                      src={photo.previewUrl}
                      alt={`Prévia da foto ${index + 1}`}
                      className="h-full w-full rounded-lg border border-border object-cover"
                    />
                    <button
                      type="button"
                      aria-label={`Remover foto ${index + 1}`}
                      onClick={() => removePhoto(index)}
                      className="absolute right-0 top-0 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--semantic-surface)] text-[var(--semantic-text-primary)] transition-colors duration-[var(--semantic-motion-duration-fast)]"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </li>
                )
              }
              return (
                <li key={slotKey}>
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted transition-colors duration-[var(--semantic-motion-duration-fast)] hover:border-[var(--semantic-border-strong)]"
                  >
                    <Camera size={18} aria-hidden="true" />
                    Adicionar foto
                  </button>
                </li>
              )
            })}
          </ul>

          {/* O seletor de arquivo é detalhe de implementação: quem oferece a
              ação é o botão "Adicionar foto" (focável, com nome). Sem tirar o
              input da árvore de acessibilidade e da ordem de foco, o mesmo
              seletor aparecia duas vezes para leitor de tela e a régua media
              um alvo de 1x1. */}
          <input
            ref={fileInput}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            multiple
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            onChange={(event) => {
              void addFiles(event.target.files)
              event.target.value = ""
            }}
          />

          <p className="text-xs text-muted">Você pode adicionar até {MAX_LISTING_PHOTOS} fotos.</p>
          {fieldError("photos")}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button
          variant="tertiary"
          size="md"
          className="min-h-11"
          isDisabled={submitting}
          onPress={() => void submit(false)}
        >
          Salvar rascunho
        </Button>
        <Button
          variant="primary"
          size="md"
          className="min-h-11"
          isDisabled={submitting}
          onPress={() => void submit(true)}
        >
          {submitting ? "Publicando…" : "Publicar anúncio"}
        </Button>
      </div>
    </div>
  )
}
