"use client"

import type { ReactNode } from "react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

/**
 * Campo e seleção (inventário §7, `shell/primitives.js`: `field` e
 * `selectField`).
 *
 * No protótipo a mesma função servia entrada e área de texto por string
 * (`type="textarea"`); em React são dois componentes. O rótulo é sempre do
 * chamador, e o alvo tem a altura do protótipo (44 px).
 */

export function Campo({
  id,
  rotulo,
  valor,
  aoMudar,
  area = false,
  nota,
  className,
  ...props
}: {
  id: string
  rotulo: string
  valor: string
  aoMudar?: (valor: string) => void
  area?: boolean
  nota?: string
  className?: string
} & Omit<React.ComponentProps<"input">, "id" | "value" | "onChange">) {
  const idDaNota = nota === undefined ? undefined : `${id}-nota`
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      {area ? (
        <Textarea
          id={id}
          value={valor}
          onChange={(evento) => aoMudar?.(evento.target.value)}
          aria-describedby={idDaNota}
          className="min-h-24 rounded-xl"
        />
      ) : (
        <Input
          id={id}
          value={valor}
          onChange={(evento) => aoMudar?.(evento.target.value)}
          aria-describedby={idDaNota}
          className="min-h-11 rounded-xl"
          {...props}
        />
      )}
      {nota === undefined ? null : (
        <p id={idDaNota} className="text-xs text-(--muted-foreground)">
          {nota}
        </p>
      )}
    </div>
  )
}

export function Selecao({
  id,
  rotulo,
  valor,
  opcoes,
  aoMudar,
  className,
}: {
  id: string
  rotulo: string
  valor: string
  opcoes: readonly { readonly valor: string; readonly titulo: string }[]
  aoMudar?: (valor: string) => void
  className?: string
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {rotulo}
      </label>
      <Select value={valor} onValueChange={(novo: string) => aoMudar?.(novo)}>
        <SelectTrigger id={id} aria-label={rotulo} data-selecao={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((opcao) => (
            <SelectItem key={opcao.valor} value={opcao.valor}>
              {opcao.titulo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** O invólucro de formulário em folha, do protótipo (`form-dialog`). */
export function Formulario({ children }: { children: ReactNode }) {
  return <div className="grid gap-4">{children}</div>
}
