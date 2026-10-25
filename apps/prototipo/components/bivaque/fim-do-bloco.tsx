"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { LISTA } from "@/lib/demo/textos"
import { EsqueletoDeLista } from "./esqueleto-de-lista"

// O fim de bloco do protótipo (`shell/paged-list.js`): quantos já aparecem, a
// barra do quanto falta e o "Mostrar mais" como reserva do carregamento
// automático — aqui não há rolagem infinita, então o botão é o caminho.
export function FimDoBloco({
  mostrados,
  total,
  pedaco,
  carregando,
  aoMostrarMais,
  fim,
}: {
  mostrados: number
  total: number
  pedaco: number
  carregando: boolean
  aoMostrarMais: () => void
  fim: ReactNode
}) {
  const restantes = total - mostrados

  if (carregando) {
    return (
      <div className="grid justify-items-center gap-3">
        <p className="text-[13px] text-(--muted-foreground)">
          {LISTA.carregandoMais(Math.min(pedaco, restantes))}
        </p>
        <EsqueletoDeLista linhas={2} />
      </div>
    )
  }

  if (mostrados < total) {
    return (
      <div className="grid justify-items-center gap-3 py-5 text-center">
        <p className="text-[13px] text-(--muted-foreground)">{LISTA.mostrando(mostrados, total)}</p>
        <span
          aria-hidden="true"
          className="block h-1 w-40 overflow-hidden rounded-sm bg-(--surface-highest)"
        >
          <i
            className="block h-full bg-(--primary)"
            style={{ width: `${Math.max(2, Math.round((mostrados / Math.max(total, 1)) * 100))}%` }}
          />
        </span>
        <Button variant="outline" onClick={aoMostrarMais}>
          {LISTA.mostrarMais(Math.min(pedaco, restantes))}
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 py-4">
      <p className="text-center text-[13px] text-(--muted-foreground)">{LISTA.visto(total)}</p>
      {fim}
    </div>
  )
}
