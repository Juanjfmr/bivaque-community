"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icone } from "./icone"
import { Marca } from "./marca"

// O que a barra de cima mostra: nas quatro telas principais, a marca e o nome da
// tela (`shell/navigation.js`, shell + titleForRoute); nas telas de dentro, a
// volta e o assunto. A volta leva à Comunidade — o mesmo destino de reserva do
// protótipo para pergunta e minhas.
function doTopo(caminho: string): { rotulo: string; raiz: boolean } {
  if (caminho === "/comunidade") return { rotulo: "Comunidade", raiz: true }
  if (caminho === "/conversas") return { rotulo: "Conversas", raiz: true }
  if (caminho === "/voce") return { rotulo: "Você", raiz: true }
  if (caminho === "/minhas") return { rotulo: "Minhas indicações", raiz: false }
  if (caminho.startsWith("/comunidade/pergunta/")) return { rotulo: "Indicação", raiz: false }
  return { rotulo: "Bivaque", raiz: true }
}

export function BarraDoTopo() {
  const caminho = usePathname()
  const { rotulo, raiz } = doTopo(caminho)

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-(--outline-variant) bg-(--background)/95 px-4 backdrop-blur md:px-7">
      {raiz ? (
        <span className="flex items-center gap-2.5">
          <Marca className="size-7 md:hidden" />
          <span className="text-xl font-bold tracking-tight">{rotulo}</span>
        </span>
      ) : (
        <>
          <Link
            href="/comunidade"
            aria-label="Voltar para a Comunidade"
            className="grid size-11 shrink-0 place-items-center rounded-full text-(--foreground) hover:bg-(--muted)"
          >
            <Icone glifo={ArrowLeft} />
          </Link>
          <span className="text-lg font-semibold">{rotulo}</span>
        </>
      )}
    </header>
  )
}
