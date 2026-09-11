"use client"

import type { LucideIcon } from "lucide-react"
import { ArrowRight, CalendarDays, Compass, Home, ShoppingBag, Wrench } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useLocalityContext } from "../../../lib/locality-context"
import { Card } from "../../components/bivaque/card"

// Prancha 61-web-explorar-servicos, desktop da esquerda (RECON-003).
// As categorias com destino real navegam; Mercado e Moradia ainda não têm
// rota e por isso são cartões sem link, sem seta e sem promessa de destino.
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
    href: null,
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

      {/* RECON-021: o campo "Buscar no Bivaque" desta tela vivia aqui e ia
          para /explorar/servicos — buscava PRESTADORES sob o rótulo do
          produto inteiro, a substituição de domínio que o processo proíbe. O
          campo do cabeçalho (GlobalSearchField) é o da prancha e leva a
          /explorar/busca; um rótulo, um destino. */}
      <section aria-labelledby="do-que-precisa-titulo" className="mt-5">
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
