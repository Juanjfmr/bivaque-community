interface ManausGuideHeroProps {
  className?: string
}

const photos = {
  skyline: {
    image:
      "https://images.unsplash.com/photo-1520464399004-1f1e8e938bb3?auto=format&fit=crop&w=1600&q=82",
    page: "https://unsplash.com/photos/aerial-photograph-of-a-city-at-sunset-yIIEzQwgQSw",
    alt: "Vista aérea de Manaus ao pôr do sol",
    label: "Manaus ao fim da tarde",
  },
  road: {
    image:
      "https://images.unsplash.com/photo-1520258355794-b4023f5ccf41?auto=format&fit=crop&w=900&q=80",
    page: "https://unsplash.com/photos/a-road-with-cars-and-trees-at-the-side-Snme_310aIM",
    alt: "Avenida arborizada com carros em Manaus",
    label: "A cidade em movimento",
  },
  river: {
    image:
      "https://images.unsplash.com/photo-1516070259022-18b1450e94d4?auto=format&fit=crop&w=900&q=80",
    page: "https://unsplash.com/photos/an-aerial-view-of-a-large-body-of-water-oF3xIZTKkFM",
    alt: "Vista aérea da água e da paisagem urbana de Manaus",
    label: "Rio e cidade",
  },
} as const

/** Manaus photography sourced from Unsplash, with source links kept visible. */
export function ManausGuideHero({ className = "" }: ManausGuideHeroProps) {
  return (
    <figure
      className={`relative grid overflow-hidden rounded-xl bg-[var(--surface-sunken)] sm:grid-cols-[1.7fr_0.8fr] ${className}`}
      aria-label="Fotografias de Manaus"
    >
      <div
        role="img"
        aria-label={photos.skyline.alt}
        className="relative min-h-60 bg-cover bg-center sm:min-h-full"
        style={{ backgroundImage: `url(${photos.skyline.image})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/75">
            Chegando em Manaus
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">
            {photos.skyline.label}
          </p>
        </div>
      </div>

      <div className="hidden grid-rows-2 gap-px bg-black/10 sm:grid">
        {[photos.road, photos.river].map((photo) => (
          <div
            key={photo.page}
            role="img"
            aria-label={photo.alt}
            className="relative min-h-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${photo.image})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
            <p className="absolute inset-x-0 bottom-0 p-3 text-xs font-medium text-white">
              {photo.label}
            </p>
          </div>
        ))}
      </div>

      <figcaption className="absolute right-2 top-2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
        Fotos:{" "}
        <a
          href={photos.skyline.page}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Tadeu Jnr / Unsplash
        </a>
      </figcaption>
    </figure>
  )
}
