import { Card as HeroCard } from "@heroui/react"
import type { ReactNode } from "react"

interface CardProps {
  children: ReactNode
  className?: string
  interactive?: boolean
}

// Token-driven card surface. Interactive cards lift from elevation-1 to
// elevation-2 on hover (pointer devices only) per DESIGN_SPEC §2.
export function Card({ children, className = "", interactive = false }: CardProps) {
  return (
    <HeroCard
      className={`bg-[var(--semantic-surface)] ${interactive ? "transition-shadow duration-[var(--semantic-motion-duration-base)] hover:shadow-[var(--semantic-elevation-raised)]" : ""} ${className}`}
    >
      {children}
    </HeroCard>
  )
}
