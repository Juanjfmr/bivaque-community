"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  removeListingPhoto,
  reorderListingPhotos,
  setListingCover,
} from "../../../lib/listings/actions"
import { uploadPropertyFiles } from "../../../lib/listings/media-client"
import styles from "./listing-cards.module.css"

// FIGMA-002 — gerenciador de fotos da edição (prancha property-edit):
// acrescentar (com EXIF removido na server action), definir capa, remover
// (linha E objeto) e reordenar num ato atômico. Cada ação é um form próprio:
// o servidor revalida dono, cota e ordem — a UI só oferece o caminho.

interface ManagedPhoto {
  id: string
  url: string | null
  position: number
  isCover: boolean
}

export function ListingPhotoManager({
  listingId,
  photos,
}: {
  listingId: string
  photos: ManagedPhoto[]
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const router = useRouter()
  async function upload(form: FormData) {
    const files = form
      .getAll("photos")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)
    const result = await uploadPropertyFiles(listingId, files)
    router.refresh()
    return result
  }
  async function run(
    action: (form: FormData) => Promise<{ ok: boolean; error: string | null }>,
    form: FormData,
  ) {
    setPending(true)
    setError(null)
    try {
      const result = await action(form)
      if (!result.ok) setError(result.error)
    } catch {
      setError("Não foi possível alterar as fotos. Tente novamente.")
    } finally {
      setPending(false)
    }
  }
  const ordered = [...photos].sort((a, b) => a.position - b.position)

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= ordered.length) return
    const ids = ordered.map((photo) => photo.id)
    const [moved] = ids.splice(index, 1)
    if (!moved) return
    ids.splice(target, 0, moved)
    setError(null)
    const form = new FormData()
    form.set("listing_id", listingId)
    form.set("order", ids.join(","))
    await run(reorderListingPhotos, form)
  }

  return (
    <div className={styles["formGrid"]}>
      <form
        action={async (form) => {
          await run(upload, form)
        }}
        className={`${styles["actionRow"]} ${styles["formFull"]}`}
      >
        <input type="hidden" name="listing_id" value={listingId} />
        <input
          type="file"
          name="photos"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className={styles["fieldInput"]}
          aria-label="Adicionar fotos"
        />
        <button type="submit" disabled={pending} className={styles["secondaryButton"]}>
          Adicionar fotos
        </button>
      </form>
      {error ? (
        <span role="alert" className={`${styles["fieldHint"]} ${styles["formFull"]}`}>
          {error}
        </span>
      ) : null}
      {ordered.length === 0 ? (
        <span className={styles["fieldHint"]}>Sem fotos ainda — adicione até 12.</span>
      ) : null}
      {ordered.map((photo, index) => (
        <div key={photo.id} className={`${styles["photoRow"]} ${styles["formFull"]}`}>
          {photo.url ? (
            <Image
              unoptimized
              width={72}
              height={52}
              src={photo.url}
              alt={`Foto ${photo.position} do anúncio`}
              className={styles["photoThumb"]}
            />
          ) : (
            <span className={styles["photoThumb"]} />
          )}
          <span className={styles["photoMeta"]}>
            <span>Foto {photo.position}</span>
            {photo.isCover ? <span>Capa</span> : null}
          </span>
          <span className={styles["photoActions"]}>
            <button
              type="button"
              className={styles["miniButton"]}
              aria-label={`Mover foto ${photo.position} para cima`}
              disabled={pending || index === 0}
              onClick={() => {
                void move(index, -1)
              }}
            >
              ↑
            </button>
            <button
              type="button"
              className={styles["miniButton"]}
              aria-label={`Mover foto ${photo.position} para baixo`}
              disabled={pending || index === ordered.length - 1}
              onClick={() => {
                void move(index, 1)
              }}
            >
              ↓
            </button>
            {!photo.isCover ? (
              <form
                action={async (form) => {
                  await run(setListingCover, form)
                }}
              >
                <input type="hidden" name="media_id" value={photo.id} />
                <button type="submit" disabled={pending} className={styles["miniButton"]}>
                  Capa
                </button>
              </form>
            ) : null}
            <form
              action={async (form) => {
                await run(removeListingPhoto, form)
              }}
            >
              <input type="hidden" name="media_id" value={photo.id} />
              <button type="submit" disabled={pending} className={styles["miniButton"]}>
                Remover
              </button>
            </form>
          </span>
        </div>
      ))}
    </div>
  )
}
