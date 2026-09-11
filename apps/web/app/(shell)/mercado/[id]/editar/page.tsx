"use client"

import { Button } from "@heroui/react"
import { ArrowLeft, Camera } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  buildListingPhotoPath,
  LISTING_CATEGORIES,
  LISTING_CONDITIONS,
} from "../../../../../lib/listings/catalog"
import { listingsClient } from "../../../../../lib/listings/client"
import {
  type ListingEditErrors,
  MANAGED_LISTING_SELECT,
  type ManagedListingRow,
  validateListingEdit,
} from "../../../../../lib/listings/lifecycle"
import { useLocalityContext } from "../../../../../lib/locality-context"
import { useMemberContext } from "../../../../../lib/member-context"
import { AccessUnavailableState } from "../../../../components/bivaque/empty-state"
import { ErrorState } from "../../../../components/bivaque/error-state"
import { FeedbackAlert } from "../../../../components/bivaque/feedback-alert"
import { Skeleton } from "../../../../components/bivaque/skeleton"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_BYTES = 10 * 1024 * 1024

interface EditState {
  status: "loading" | "ready" | "error" | "unavailable" | "signed-out"
  listing: ManagedListingRow | null
  photoPath: string | null
  photoUrl: string | null
}

const INITIAL_STATE: EditState = {
  status: "loading",
  listing: null,
  photoPath: null,
  photoUrl: null,
}

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

export default function EditarAnuncioPage() {
  const params = useParams<{ id: string }>()
  const listingId = params.id
  const router = useRouter()
  const { current } = useLocalityContext()
  const { communities } = useMemberContext()
  const [state, setState] = useState<EditState>(INITIAL_STATE)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("")
  const [price, setPrice] = useState("")
  const [condition, setCondition] = useState("used_good")
  const [description, setDescription] = useState("")
  const [neighborhood, setNeighborhood] = useState("")
  const [errors, setErrors] = useState<ListingEditErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setState(INITIAL_STATE)
    setSaveError(null)
    setSaved(false)
    const supabase = listingsClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user === null) {
      setState({ status: "signed-out", listing: null, photoPath: null, photoUrl: null })
      return
    }

    const { data, error } = await supabase
      .from("listings")
      .select(MANAGED_LISTING_SELECT)
      .eq("id", listingId)
      .maybeSingle()

    if (error) {
      setState({ status: "error", listing: null, photoPath: null, photoUrl: null })
      return
    }
    if (data === null) {
      setState({ status: "unavailable", listing: null, photoPath: null, photoUrl: null })
      return
    }

    const listing = data as unknown as ManagedListingRow
    if (listing.owner_id !== user.id) {
      setState({ status: "unavailable", listing: null, photoPath: null, photoUrl: null })
      return
    }

    setTitle(listing.title)
    setCategory(listing.category)
    setPrice(
      listing.price_cents % 100 === 0
        ? String(listing.price_cents / 100)
        : (listing.price_cents / 100).toFixed(2).replace(".", ","),
    )
    setCondition(listing.condition)
    setDescription(listing.description)
    setNeighborhood(listing.neighborhood)

    let photoPath: string | null = null
    let photoUrl: string | null = null
    const { data: photoRows } = await supabase
      .from("listing_photos")
      .select("storage_path,position")
      .eq("listing_id", listing.id)
      .order("position", { ascending: true })
      .limit(1)
    const first = (photoRows ?? [])[0] as { storage_path: string } | undefined
    if (first !== undefined) {
      photoPath = first.storage_path
      const { data: signed } = await supabase.storage
        .from("listing-photos")
        .createSignedUrl(first.storage_path, 3600)
      photoUrl = signed?.signedUrl ?? null
    }

    setState({ status: "ready", listing, photoPath, photoUrl })
  }, [listingId])

  useEffect(() => {
    void load()
  }, [load])

  const audienceValue =
    state.listing === null
      ? current.cityName
      : state.listing.audience_type === "community"
        ? (communities.find((community) => community.id === state.listing?.community_id)?.name ??
          "Comunidade")
        : current.cityName

  async function save() {
    if (state.listing === null || saving) return
    setSaved(false)
    const validation = validateListingEdit({
      title,
      category,
      priceInput: price,
      condition,
      description,
      neighborhood,
    })
    if (!validation.ok) {
      setErrors(validation.errors)
      return
    }
    setErrors({})
    setSaveError(null)
    setSaving(true)

    const supabase = listingsClient()
    const value = validation.value
    const { data: updated, error } = await supabase
      .from("listings")
      .update({
        title: value.title,
        category: value.category,
        price_cents: value.priceCents,
        condition: value.condition,
        description: value.description,
        neighborhood: value.neighborhood,
      })
      .eq("id", state.listing.id)
      .eq("updated_at", state.listing.updated_at)
      .select("id")

    setSaving(false)

    if (error) {
      setSaveError("Não foi possível salvar. Suas alterações continuam aqui.")
      return
    }
    if ((updated ?? []).length === 0) {
      setSaveError(
        "Este anúncio mudou em outra sessão. Suas alterações continuam aqui; recarregue antes de salvar.",
      )
      return
    }

    await load()
    setSaved(true)
  }

  async function changePhoto(fileList: FileList | null) {
    const file = fileList?.[0]
    if (file === undefined || state.listing === null || uploading) return
    if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_FILE_BYTES) {
      setSaveError("Escolha uma imagem JPG, PNG ou WebP de até 10MB.")
      return
    }
    setSaveError(null)
    setSaved(false)
    setUploading(true)

    const supabase = listingsClient()
    const previousPath = state.photoPath
    let newPath: string | null = null
    try {
      const blob = await stripExif(file)
      newPath = buildListingPhotoPath(state.listing.id, 0, blob.type)
      const { error: uploadError } = await supabase.storage
        .from("listing-photos")
        .upload(newPath, blob, { contentType: blob.type, upsert: false })
      if (uploadError) throw new Error(uploadError.message)

      const { error: photoError } = await supabase
        .from("listing_photos")
        .upsert(
          { listing_id: state.listing.id, storage_path: newPath, position: 0 },
          { onConflict: "listing_id,position" },
        )
      if (photoError) throw new Error(photoError.message)

      if (previousPath !== null && previousPath !== newPath) {
        await supabase.storage.from("listing-photos").remove([previousPath])
      }

      const { data: signed } = await supabase.storage
        .from("listing-photos")
        .createSignedUrl(newPath, 3600)
      setState((previous) => ({
        ...previous,
        photoPath: newPath,
        photoUrl: signed?.signedUrl ?? null,
      }))
    } catch {
      if (newPath !== null) {
        await supabase.storage.from("listing-photos").remove([newPath])
      }
      setSaveError("Não foi possível trocar a foto. A foto anterior continua aqui.")
    }
    setUploading(false)
  }

  const fieldError = (key: keyof ListingEditErrors) =>
    errors[key] === undefined ? null : (
      <p className="text-xs text-[var(--semantic-danger)]">{errors[key]}</p>
    )

  if (state.status === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8" aria-busy="true">
        <h1 className="text-2xl font-semibold tracking-tight">Editar anúncio</h1>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (state.status === "signed-out") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Editar anúncio</h1>
        <AccessUnavailableState
          title="Sua sessão expirou"
          description="Entre novamente para editar o seu anúncio."
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
        <h1 className="text-2xl font-semibold tracking-tight">Editar anúncio</h1>
        <ErrorState
          message="Não foi possível carregar este anúncio agora."
          onRetry={() => void load()}
        />
      </div>
    )
  }

  if (state.status === "unavailable" || state.listing === null) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Editar anúncio</h1>
        <AccessUnavailableState
          title="Anúncio indisponível"
          description="Ele não existe ou não é seu. Só o dono edita o próprio anúncio."
          primaryAction={
            <Button
              variant="primary"
              size="sm"
              onPress={() => router.push("/meus-anuncios" as Route)}
            >
              Voltar para meus anúncios
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <Link
        href={"/meus-anuncios" as Route}
        className="flex w-fit items-center gap-1.5 text-sm text-muted hover:text-[var(--semantic-text-primary)]"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Meus anúncios
      </Link>

      <nav aria-label="Trilha" className="flex items-center gap-2 text-xs text-muted">
        <Link href={"/meus-anuncios" as Route} className="hover:underline">
          Meus anúncios
        </Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Editar anúncio</span>
      </nav>

      <h1 className="text-2xl font-semibold tracking-tight">Editar anúncio</h1>

      {saveError ? <FeedbackAlert variant="danger" description={saveError} /> : null}
      {saved && saveError === null ? (
        <FeedbackAlert variant="success" description="Alterações salvas." />
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium">Foto do anúncio</span>
          <div className="h-72 w-full overflow-hidden rounded-2xl border border-border bg-[var(--semantic-surface-sunken)]">
            {state.photoUrl === null ? (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted">
                Sem foto
              </div>
            ) : (
              <>
                {/* biome-ignore lint/performance/noImgElement: URL assinada de bucket privado; next/image não agrega aqui */}
                <img
                  src={state.photoUrl}
                  alt="Foto atual do anúncio"
                  className="h-full w-full object-cover"
                />
              </>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            className="sr-only"
            aria-label="Escolher nova foto do anúncio"
            onChange={(event) => {
              void changePhoto(event.target.files)
              event.target.value = ""
            }}
          />
          <Button
            variant="secondary"
            className="min-h-11"
            isDisabled={uploading}
            onPress={() => fileInput.current?.click()}
          >
            <Camera size={16} aria-hidden="true" />
            {uploading ? "Enviando…" : "Alterar foto"}
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="editar-titulo" className="text-sm font-medium">
              Título
            </label>
            <input
              id="editar-titulo"
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              className="min-h-11 rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus-outer)]"
            />
            {fieldError("title")}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="editar-preco" className="text-sm font-medium">
              Preço
            </label>
            <div className="flex min-h-11 items-center rounded-lg border border-border bg-[var(--semantic-surface)] px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--semantic-focus-outer)]">
              <span className="pr-2 text-sm text-muted">R$</span>
              <input
                id="editar-preco"
                value={price}
                inputMode="decimal"
                onChange={(event) => setPrice(event.target.value)}
                className="min-h-11 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            {fieldError("price")}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="editar-descricao" className="text-sm font-medium">
              Descrição
            </label>
            <textarea
              id="editar-descricao"
              value={description}
              rows={3}
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
              className="rounded-lg border border-border bg-[var(--semantic-surface)] px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus-outer)]"
            />
            {fieldError("description")}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="editar-categoria" className="text-sm font-medium">
              Categoria
            </label>
            <select
              id="editar-categoria"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="min-h-11 rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm"
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

          <div className="flex flex-col gap-1">
            <label htmlFor="editar-condicao" className="text-sm font-medium">
              Condição
            </label>
            <select
              id="editar-condicao"
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              className="min-h-11 rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm"
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
            <label htmlFor="editar-bairro" className="text-sm font-medium">
              Bairro
            </label>
            <input
              id="editar-bairro"
              value={neighborhood}
              maxLength={80}
              onChange={(event) => setNeighborhood(event.target.value)}
              className="min-h-11 rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-focus-outer)]"
            />
            {fieldError("neighborhood")}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="editar-comunidade" className="text-sm font-medium">
              Comunidade (não é possível alterar)
            </label>
            <input
              id="editar-comunidade"
              value={audienceValue}
              disabled
              readOnly
              aria-describedby="editar-comunidade-ajuda"
              className="min-h-11 rounded-lg border border-border bg-[var(--semantic-surface-sunken)] px-3 text-sm text-[var(--semantic-text-secondary)]"
            />
            <p id="editar-comunidade-ajuda" className="text-xs text-muted">
              O público é escolhido na criação e não muda depois — trocá-lo contornaria o acesso.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button
          variant="tertiary"
          className="min-h-11"
          isDisabled={saving}
          onPress={() => router.push("/meus-anuncios" as Route)}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          className="min-h-11"
          isDisabled={saving}
          onPress={() => void save()}
        >
          {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </div>
  )
}
