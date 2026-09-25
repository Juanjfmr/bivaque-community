import type { Route } from "next"
import Link from "next/link"
import type { ButtonHTMLAttributes, ReactNode } from "react"

// Três variantes, uma altura. A escolha de variante diz a importância da ação:
// uma primária por bloco, o resto secundário ou discreto.
export type ButtonVariant = "primary" | "secondary" | "ghost"

const BASE =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-ui px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-brand disabled:opacity-50"

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ui-brand text-ui-on-brand hover:bg-ui-brand-hover",
  secondary: "bg-ui-surface text-ui-ink shadow-ui ring-1 ring-ui-line hover:bg-ui-subtle",
  ghost: "text-ui-brand hover:bg-ui-subtle",
}

export function buttonClasses(variant: ButtonVariant = "secondary", extra = ""): string {
  return `${BASE} ${VARIANTS[variant]} ${extra}`
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({ variant, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...rest} />
}

interface ButtonLinkProps {
  href: string
  variant?: ButtonVariant
  className?: string
  children: ReactNode
  "aria-label"?: string
}

export function ButtonLink({ href, variant, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link href={href as Route} className={buttonClasses(variant, className)} {...rest}>
      {children}
    </Link>
  )
}
