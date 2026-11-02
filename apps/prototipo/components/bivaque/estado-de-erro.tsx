"use client"

import { CircleAlert, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ERRO } from "@/lib/demo/textos"
import { Icone } from "./icone"

// O caminho de erro do protótipo (`features/entry/account.js`): o que falhou, o
// que fazer e um "Tentar de novo" que tenta de verdade — a tela recarrega.
export function EstadoDeErro({ aoTentar }: { aoTentar: () => void }) {
  return (
    <div
      role="alert"
      className="grid justify-items-center gap-3 rounded-2xl bg-(--surface-lowest) px-5 py-8 text-center"
    >
      <span className="grid size-12 place-items-center rounded-full bg-(--muted)">
        <Icone glifo={CircleAlert} className="size-6 text-(--destructive)" />
      </span>
      <h3>{ERRO.titulo}</h3>
      <p className="max-w-md text-sm text-(--muted-foreground)">{ERRO.texto}</p>
      <Button onClick={aoTentar}>
        <Icone glifo={RefreshCw} />
        {ERRO.tentar}
      </Button>
    </div>
  )
}
