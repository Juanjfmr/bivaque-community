"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import type { BusinessContentData } from "../../../lib/providers/business-data"
import { Button } from "../../components/ui/button"

export function BusinessGallery({
  photos,
  name,
}: {
  photos: BusinessContentData["photos"]
  name: string
}) {
  const [selected, setSelected] = useState(0)
  const current = photos[selected] ?? photos[0]
  if (!current) return null
  return (
    <section
      aria-label="Fotos do negócio"
      className="overflow-hidden rounded-ui-lg border border-ui-line bg-ui-surface shadow-ui"
    >
      <figure>
        {/* biome-ignore lint/performance/noImgElement: URLs assinadas do bucket privado. */}
        <img
          src={current.url}
          alt={current.caption || `Trabalho de ${name}`}
          className="aspect-[16/10] w-full object-cover sm:aspect-[16/9]"
        />
        <figcaption className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
          <p className="min-w-0 text-sm text-ui-ink-2 [overflow-wrap:anywhere]">
            {current.caption || `Fotos de ${name}`}
          </p>
          <span className="shrink-0 text-xs text-ui-ink-2">
            {selected + 1}/{photos.length}
          </span>
        </figcaption>
      </figure>
      {photos.length > 1 ? (
        <div className="border-t border-ui-line p-3">
          <div className="mb-3 flex justify-end gap-2">
            <Button
              variant="ghost"
              aria-label="Foto anterior"
              onClick={() => setSelected((index) => (index - 1 + photos.length) % photos.length)}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              aria-label="Próxima foto"
              onClick={() => setSelected((index) => (index + 1) % photos.length)}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                aria-label={`Ver foto ${index + 1}`}
                aria-pressed={index === selected}
                onClick={() => setSelected(index)}
                className={`min-h-11 overflow-hidden rounded-ui border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-brand ${index === selected ? "border-ui-brand" : "border-transparent hover:border-ui-line"}`}
              >
                {/* biome-ignore lint/performance/noImgElement: miniatura assinada do bucket privado. */}
                <img src={photo.url} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
