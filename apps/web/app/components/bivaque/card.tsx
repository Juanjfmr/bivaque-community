import { Card as HeroCard } from "@heroui/react"
import type { ReactNode } from "react"

interface CardProps {
  children: ReactNode
  className?: string
  interactive?: boolean
}

// The editorial content surface: paper, hairline, near-square corners.
//
// This used to be a rounded-2xl surface that lifted from elevation-1 to
// elevation-2 on hover. That treatment is the reason lists read as a stack of
// floating widgets rather than a page: once every item casts an ambient shadow
// over a grey background, nothing on screen is quieter than anything else and
// the eye has no hierarchy to follow.
//
// Elevation now stays flat (--elevation-1 is a 1px seat, not a cloud) and
// hover moves the border and surface instead of raising the box. Shadow is
// reserved for things that genuinely float — menus, modals, toasts.
export function Card({ children, className = "", interactive = false }: CardProps) {
  return (
    <HeroCard
      className={`rounded-[var(--radius)] border border-border bg-[var(--surface-raised)] shadow-none ${
        interactive
          ? "transition-colors duration-[var(--duration-fast)] hover:border-[var(--accent-soft)] hover:bg-[var(--surface-subtle)]"
          : ""
      } ${className}`}
    >
      {children}
    </HeroCard>
  )
}
