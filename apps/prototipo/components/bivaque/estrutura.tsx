"use client"

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { BarraDeNavegacao } from "./barra-de-navegacao"
import { BarraDoTopo } from "./barra-do-topo"

// O redesign é isolado na jornada Comunidade: não muda o shell de outras telas.
export function Estrutura({ children }: { children: ReactNode }) {
  const caminho = usePathname()
  if (caminho.startsWith("/comunidade")) {
    return <div className="min-h-dvh">
      <main id="conteudo">{children}</main>
    </div>
  }
  return (
    <div className="min-h-dvh md:pl-24">
      <BarraDoTopo />
      <main id="conteudo" className="mx-auto w-full max-w-[1120px] px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-7 md:pb-16">{children}</main>
      <BarraDeNavegacao />
    </div>
  )
}
