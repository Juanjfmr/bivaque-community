import type { ReactNode } from "react"
import { BarraDeNavegacao } from "./barra-de-navegacao"
import { BarraDoTopo } from "./barra-do-topo"

// A casca do app: a barra de cima, o conteúdo e a navegação. Do tablet para
// cima, a coluna de navegação ocupa 96 px à esquerda e o conteúdo começa depois
// dela (o `--rail` do protótipo).
export function Estrutura({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:pl-24">
      <BarraDoTopo />
      <main
        id="conteudo"
        className="mx-auto w-full max-w-[1120px] px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-7 md:pb-16"
      >
        {children}
      </main>
      <BarraDeNavegacao />
    </div>
  )
}
