"use client"

import type { LucideIcon } from "lucide-react"
import { ArrowRight, CalendarDays, Compass, Home, Search, ShoppingBag, Wrench } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useLocalityContext } from "../../../lib/locality-context"
import { Card } from "../../components/bivaque/card"

// Prancha 61-web-explorar-servicos, desktop da esquerda (RECON-003).
// As categorias com destino real navegam; Mercado ainda não tem rota e por
// isso é cartão sem link, sem seta e sem promessa de destino. Moradia passou a
// navegar para /imoveis no RECON-027.
// Os destaques da prancha não são renderizados: nenhum dado real os sustenta
// ainda, e seção vazia inventada é exatamente o que o contrato proíbe.

type Category = {
  icon: LucideIcon
  title: string
  description: string
  href: Route | null
}

const CATEGORIES: Category[] = [
  {
    icon: Compass,
    title: "Guia",
    description: "Descubra lugares, dicas e informações da cidade.",
    href: "/guide",
  },
  {
    icon: ShoppingBag,
    title: "Mercado",
    description: "Comércios, produtos e muito mais.",
    href: null,
  },
  {
    icon: Wrench,
    title: "Serviços",
    description: "Encontre profissionais para o que precisar.",
    href: "/explorar/servicos",
  },
  {
    icon: Home,
    title: "Moradia",
    description: "Aluguel, repúblicas e quartos.",
    href: "/imoveis",
  },
  {
    icon: CalendarDays,
    title: "Eventos",
    description: "Veja o que vai acontecer por perto.",
    href: "/events",
  },
]

function CategoryCard({ icon: Icon, title, description, href }: Category) {
  const inner = (
    <div className="flex h-full min-h-28 flex-col gap-1.5 p-4">
      <Icon size={22} aria-hidden="true" className="text-[var(--accent)]" />
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs leading-relaxed text-muted">{description}</span>
      {href !== null ? (
        <ArrowRight size={16} aria-hidden="true" className="mt-auto text-muted" />
      ) : null}
    </div>
  )

  return (
    <li className="h-full">
      {href !== null ? (
        <Link
          href={href}
          className="block h-full transition-colors duration-[var(--semantic-motion-duration-instant)]"
        >
          <Card interactive className="h-full">
            {inner}
          </Card>
        </Link>
      ) : (
        <Card className="h-full">{inner}</Card>
      )}
    </li>
  )
}

export default function ExplorarPage() {
  const { current } = useLocalityContext()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Explorar{" "}
        <span className="text-[var(--accent)]">
          {current.cityName}, {current.stateCode}
        </span>
      </h1>
      <p className="mt-1 text-sm text-muted">
        Encontre guias, serviços, comércios, moradia e eventos na sua cidade.
      </p>

      <search className="mt-5 block">
        <form action="/explorar/servicos" method="get">
          <label htmlFor="explorar-busca" className="sr-only">
            Buscar no Bivaque
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-[var(--semantic-surface)] px-3">
            <Search size={18} aria-hidden="true" className="shrink-0 text-muted" />
            <input
              id="explorar-busca"
              name="search"
              type="search"
              placeholder="Buscar no Bivaque"
              className="min-h-11 w-full bg-transparent text-sm transition-colors duration-[var(--semantic-motion-duration-instant)]"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-sm font-medium text-[var(--accent)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)]"
            >
              <Search size={18} aria-hidden="true" />
            </button>
          </div>
        </form>
      </search>

      <section aria-labelledby="do-que-precisa-titulo" className="mt-8">
        <h2 id="do-que-precisa-titulo" className="text-base font-semibold tracking-tight">
          Do que você precisa?
        </h2>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CATEGORIES.map((category) => (
            <CategoryCard key={category.title} {...category} />
          ))}
        </ul>
      </section>
    </div>
  )
}
