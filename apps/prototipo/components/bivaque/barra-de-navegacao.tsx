"use client"

import { Home, type LucideIcon, MessageCircle, Plus, User, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PESSOA } from "@/lib/demo/textos"
import { ABAS, type AbaPrincipal, abaAtiva } from "@/lib/navegacao"
import { cn } from "@/lib/utils"
import { Icone } from "./icone"
import { Marca } from "./marca"
import { useBivaque } from "./provedor"

const GLIFOS: Record<AbaPrincipal, LucideIcon> = {
  inicio: Home,
  comunidade: Users,
  conversas: MessageCircle,
  voce: User,
}

// O Criar é o terceiro lugar da barra de baixo e o segundo da coluna: por isso a
// ordem de cada aba, escrita por extenso para o Tailwind enxergar.
const ORDEM: Record<AbaPrincipal, string> = {
  inicio: "order-1 md:order-3",
  comunidade: "order-2 md:order-4",
  conversas: "order-4 md:order-5",
  voce: "order-5 md:order-6",
}

// A barra de navegação do protótipo (`styles/nav-bar.css` + `create-rail.css`):
// no celular os cinco lugares da barra de baixo, com o Criar elevado no meio; do
// tablet para cima, a coluna da esquerda, com o Criar no alto. A aba ativa sai do
// endereço — quem diz é `abaAtiva`.
export function BarraDeNavegacao() {
  const caminho = usePathname()
  const atual = abaAtiva(caminho)
  const { abrirPerguntar } = useBivaque()

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-between border-t border-(--outline-variant) bg-(--background) px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_24px_var(--shadow-soft)] md:inset-y-0 md:right-auto md:left-0 md:w-24 md:flex-col md:items-center md:justify-start md:gap-2 md:border-t-0 md:border-r md:px-0 md:pt-5 md:pb-6 md:shadow-none"
    >
      <span className="hidden md:order-1 md:mb-3 md:grid md:place-items-center">
        <Marca className="size-9" />
      </span>

      <button
        type="button"
        onClick={abrirPerguntar}
        className="order-3 flex flex-1 flex-col items-center gap-0.5 rounded-xl text-[12px] leading-4 font-medium text-(--muted-foreground) md:order-2 md:w-full md:flex-none md:pb-2"
      >
        <span className="-mt-6 grid size-14 place-items-center rounded-[18px] bg-(--brasa) text-(--brasa-foreground) shadow-[0_4px_16px_var(--shadow-strong)] md:mt-0 md:size-11 md:rounded-[14px] lg:flex lg:h-12 lg:w-auto lg:items-center lg:gap-2 lg:px-3.5">
          <Icone glifo={Plus} className="size-7 md:size-6" />
          <span className="hidden text-sm font-bold lg:inline">Criar</span>
        </span>
        <span className="md:hidden">Criar</span>
      </button>

      {ABAS.map((aba) => {
        const ativo = atual === aba.id
        return (
          <Link
            key={aba.id}
            href={aba.href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-start gap-1 rounded-xl pt-2.5 pb-2 text-[12px] leading-4 font-medium text-(--muted-foreground) md:w-full md:flex-none md:py-2.5",
              ORDEM[aba.id],
              ativo && "text-(--primary)",
            )}
          >
            {aba.id === "voce" ? (
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full bg-(--surface-high) text-[10px] font-bold",
                  ativo && "bg-(--primary) text-(--primary-foreground)",
                )}
              >
                {PESSOA.iniciais}
              </span>
            ) : (
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-lg",
                  ativo && "bg-(--primary-container)",
                )}
              >
                <Icone glifo={GLIFOS[aba.id]} className="size-6" />
              </span>
            )}
            <span>{aba.rotulo}</span>
          </Link>
        )
      })}
    </nav>
  )
}
