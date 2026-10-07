"use client"

import Image from "next/image"
import { useState } from "react"
import styles from "./listing-cards.module.css"

// FIGMA-002 — galeria do detalhe na geometria da prancha property-detail:
// "Foto x de y" com anterior/próxima e placeholder honesto quando o anúncio
// não tem fotos (publicar sem foto é permitido).

interface GalleryPhoto {
  url: string | null
  alt: string
}

export function ListingGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [index, setIndex] = useState(0)
  const current = photos[index]

  if (photos.length === 0 || !current) {
    return (
      <div className={styles["gallery"]}>
        <div className={styles["galleryPlaceholder"]}>Sem fotos ainda</div>
      </div>
    )
  }

  return (
    <div>
      <div className={styles["gallery"]}>
        {current.url ? (
          <Image unoptimized width={1600} height={900} src={current.url} alt={current.alt} />
        ) : (
          <div className={styles["galleryPlaceholder"]}>Foto indisponível agora</div>
        )}
      </div>
      <div className={styles["galleryBar"]}>
        <span className={styles["galleryCount"]} aria-live="polite">
          Foto {index + 1} de {photos.length}
        </span>
        <div className={styles["galleryNav"]}>
          <button
            type="button"
            className={styles["galleryButton"]}
            aria-label="Foto anterior"
            disabled={index === 0}
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
          >
            ‹
          </button>
          <button
            type="button"
            className={styles["galleryButton"]}
            aria-label="Próxima foto"
            disabled={index === photos.length - 1}
            onClick={() => setIndex((value) => Math.min(photos.length - 1, value + 1))}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}
