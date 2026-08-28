import Image from "next/image"
import type { ReactNode } from "react"

interface EmptyStateProps {
  title: string
  description?: string
  /** Photographic plate above the text. Use for the aspirational, first-visit
   *  moments — the empty states a member reads as "this is what this place is
   *  for". Mutually exclusive with `illustration`; if both arrive, the photo
   *  wins, because a drawing under a photo reads as two competing systems. */
  image?: { src: string; alt: string }
  /** Engraved artwork from ./illustrations. Use for the operational states —
   *  no results, nothing scheduled, nothing unread. */
  illustration?: ReactNode
  /** Primary recovery action. An empty state without one is a dead end. */
  action?: ReactNode
  /** Quieter escape hatch beside the primary action (e.g. "limpar filtros"). */
  secondaryAction?: ReactNode
  /** Last line, smaller: the rule that explains *why* it is empty. */
  hint?: string
  className?: string
}

// A real empty state: a plate, a headline set like a headline, one sentence of
// explanation at a readable measure, and a way out.
//
// The previous version was a dashed-border box with 14px semibold text — the
// placeholder look that reads as "this screen is unfinished" rather than "there
// is genuinely nothing here yet". VISUAL_GUIDE §0 already forbade the dashed
// box; it was still the component's own default.
//
// Two registers, deliberately not one:
//
//   photo         — the aspirational moments. The acquisition funnel already
//                   sells the product with photographs of people together; an
//                   arriving member who then meets only line drawings has been
//                   promised something the product does not deliver.
//   illustration  — the operational moments. A photograph of a party over
//                   "nenhum resultado para essa busca" is a lie about how
//                   important the moment is.
export function EmptyState({
  title,
  description,
  image,
  illustration,
  action,
  secondaryAction,
  hint,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`overflow-hidden rounded-[var(--radius)] border border-border bg-[var(--surface-raised)] ${className}`}
    >
      {image ? (
        // The plate sits flush to the card edges, the way a photograph sits on
        // a printed page — inset with its own rounding would read as a widget.
        // 21:9 keeps it a band rather than a hero: this is an empty state, not
        // a landing page, and the text below is the point.
        <div className="relative aspect-[21/9] w-full bg-[var(--surface-sunken)]">
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 768px) 100vw, 42rem"
            className="object-cover"
          />
          {/* Warm veil so a full-colour photograph settles into the paper
              palette instead of fighting it. Decorative, never over text. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[var(--background)] opacity-15 mix-blend-multiply"
          />
        </div>
      ) : null}

      <div className="px-6 py-10 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center">
          {!image && illustration && <div className="mb-5">{illustration}</div>}
          <h3 className="font-serif text-[var(--text-xl)] font-semibold text-foreground">
            {title}
          </h3>
          {description && (
            <p className="mt-2 text-pretty text-sm leading-relaxed text-muted">{description}</p>
          )}
          {(action || secondaryAction) && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {action}
              {secondaryAction}
            </div>
          )}
          {hint && (
            <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted">
              {hint}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
