"use client"

import { Button, Spinner } from "@heroui/react"
import { ImagePlus, Trash2 } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  COMMUNITY_IMAGE_MAX_BYTES,
  COMMUNITY_IMAGE_MIME_TYPES,
  type CommunityImageKind,
  communityImageAltText,
} from "../../../../../../lib/communities/community-media"
import { removeCommunityImageAction, setCommunityImageAction } from "../../../actions"

type Busy = { kind: CommunityImageKind; phase: "preparing" | "uploading" } | null

interface CommunityMediaFormProps {
  communityId: string
  communityName: string
  canManage: boolean
  bannerUrl: string | null
  thumbnailUrl: string | null
}

export function CommunityMediaForm({
  communityId,
  communityName,
  canManage,
  bannerUrl,
  thumbnailUrl,
}: CommunityMediaFormProps) {
  const router = useRouter()
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  async function reencode(file: File): Promise<Blob> {
    const image = document.createElement("img")
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error("não foi possível ler a imagem"))
      image.src = URL.createObjectURL(file)
    })
    const canvas = document.createElement("canvas")
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext("2d")
    if (!context) throw new Error("canvas indisponível")
    context.drawImage(image, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92),
    )
    if (!blob) throw new Error("não foi possível converter a imagem")
    return blob
  }

  async function handleFile(kind: CommunityImageKind, file: File) {
    setError("")
    setNotice("")
    if (!(COMMUNITY_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("Use uma imagem PNG, JPG ou WEBP.")
      return
    }
    if (file.size > COMMUNITY_IMAGE_MAX_BYTES) {
      setError("A imagem deve ter no máximo 10MB.")
      return
    }
    setBusy({ kind, phase: "preparing" })
    try {
      // O canvas reencoda e descarta o EXIF antes do envio (D5).
      const blob = await reencode(file)
      setBusy({ kind, phase: "uploading" })
      const formData = new FormData()
      formData.append("communityId", communityId)
      formData.append("kind", kind)
      formData.append("image", blob, `${kind}.jpg`)
      await setCommunityImageAction(formData)
      setNotice(kind === "banner" ? "Faixa atualizada." : "Miniatura atualizada.")
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : ""
      setError(
        message.includes("responde pela comunidade")
          ? message
          : "Não foi possível enviar a imagem. Tente de novo.",
      )
    } finally {
      setBusy(null)
    }
  }

  async function handleRemove(kind: CommunityImageKind) {
    setError("")
    setNotice("")
    setBusy({ kind, phase: "uploading" })
    try {
      const formData = new FormData()
      formData.append("communityId", communityId)
      formData.append("kind", kind)
      await removeCommunityImageAction(formData)
      setNotice(kind === "banner" ? "Faixa removida." : "Miniatura removida.")
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : ""
      setError(
        message.includes("responde pela comunidade")
          ? message
          : "Não foi possível remover a imagem. Tente de novo.",
      )
    } finally {
      setBusy(null)
    }
  }

  if (!canManage) {
    return (
      <p className="rounded-xl border border-border bg-[var(--semantic-surface-sunken)] p-4 text-sm text-muted">
        Só quem responde pela {communityName} pode enviar, trocar ou remover as imagens.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[var(--semantic-danger)] px-4 py-3 text-sm text-[var(--semantic-danger)]"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" aria-live="polite" className="text-sm text-muted">
          {notice}
        </p>
      )}

      <MediaField
        kind="banner"
        label="Faixa de topo"
        hint="Imagem larga exibida no topo da apresentação. PNG, JPG ou WEBP até 10MB."
        url={bannerUrl}
        busy={busy?.kind === "banner"}
        disabled={busy !== null}
        onFile={handleFile}
        onRemove={handleRemove}
      />

      <MediaField
        kind="thumbnail"
        label="Miniatura"
        hint="Imagem quadrada dos cartões e da barra lateral. PNG, JPG ou WEBP até 10MB."
        url={thumbnailUrl}
        busy={busy?.kind === "thumbnail"}
        disabled={busy !== null}
        onFile={handleFile}
        onRemove={handleRemove}
      />
    </div>
  )
}

function MediaField({
  kind,
  label,
  hint,
  url,
  busy,
  disabled,
  onFile,
  onRemove,
}: {
  kind: CommunityImageKind
  label: string
  hint: string
  url: string | null
  busy: boolean
  disabled: boolean
  onFile: (kind: CommunityImageKind, file: File) => void
  onRemove: (kind: CommunityImageKind) => void
}) {
  const inputId = `community-image-${kind}`
  return (
    <section aria-label={label} className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{label}</h2>
        <p className="text-sm text-muted">{hint}</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        {url ? (
          <Image
            src={url}
            alt={communityImageAltText(kind)}
            width={kind === "banner" ? 1200 : 112}
            height={kind === "banner" ? 384 : 112}
            unoptimized
            className={kind === "banner" ? "h-40 w-full object-cover" : "h-28 w-28 object-cover"}
          />
        ) : (
          <p className="flex h-28 items-center justify-center bg-[var(--semantic-surface-sunken)] text-sm text-muted">
            Sem imagem ainda
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={inputId}
          className="relative inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-[var(--semantic-surface-sunken)] px-4 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:border-[var(--semantic-action-primary)] focus-within:ring-2 focus-within:ring-[var(--semantic-focus)]"
        >
          {busy ? (
            <span className="flex items-center gap-2 text-muted">
              <Spinner size="sm" aria-label="Enviando imagem" />
              Enviando…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ImagePlus size={16} aria-hidden="true" />
              {url ? "Trocar imagem" : "Enviar imagem"}
            </span>
          )}
          <input
            id={inputId}
            type="file"
            accept={COMMUNITY_IMAGE_MIME_TYPES.join(",")}
            disabled={disabled}
            aria-label={`${url ? "Trocar" : "Enviar"} ${label.toLowerCase()}`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 transition-opacity duration-[var(--semantic-motion-duration-instant)]"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onFile(kind, file)
              event.target.value = ""
            }}
          />
        </label>

        {url && (
          <Button
            variant="tertiary"
            className="min-h-11"
            isDisabled={disabled}
            onPress={() => onRemove(kind)}
            aria-label={`Remover ${label.toLowerCase()}`}
          >
            <Trash2 size={16} aria-hidden="true" />
            Remover
          </Button>
        )}
      </div>
    </section>
  )
}
