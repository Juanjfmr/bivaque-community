"use client"

import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Icone } from "./icone"

/**
 * Botão e botão de ícone (inventário §7, `shell/primitives.js`: `btn` e
 * `iconBtn`).
 *
 * No protótipo o `kind` escolhia o elemento Material Web e o `data-action`
 * dizia quem tratava; aqui a variante é prop e quem trata é o `onClick`. O
 * `btn` do protótipo também ganhava `aria-haspopup` por adivinhar o sufixo da
 * ação (`-menu`); isso é acoplamento que o inventário manda corrigir: aqui o
 * `aria-haspopup` é prop explícita.
 */

export type TomDoBotao = "preenchido" | "tonal" | "texto" | "contornado" | "perigo"

const VARIANTE: Record<TomDoBotao, "brasa" | "secondary" | "ghost" | "outline" | "destructive"> = {
  preenchido: "brasa",
  tonal: "secondary",
  texto: "ghost",
  contornado: "outline",
  perigo: "destructive",
}

export function Botao({
  tom = "preenchido",
  icone,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  tom?: TomDoBotao
  icone?: React.ComponentProps<typeof Icone>["nome"]
}) {
  return (
    <Button
      data-tom={tom}
      variant={VARIANTE[tom]}
      // O protótipo usa 44 px de altura em todo botão (base.css:16).
      className={cn("min-h-11 rounded-xl px-4 text-sm", className)}
      {...props}
    >
      {icone === undefined ? null : <Icone nome={icone} />}
      {children}
    </Button>
  )
}

export function BotaoDeIcone({
  rotulo,
  nome,
  aberto,
  children,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  /** Nome acessível do botão. O ícone é enfeite e não entra aqui. */
  rotulo: string
  nome: React.ComponentProps<typeof Icone>["nome"]
  /** Marca o botão que abre um menu, uma folha ou um diálogo. */
  aberto?: "menu" | "dialog" | "listbox" | "grid" | "tree"
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={rotulo}
      aria-haspopup={aberto}
      className={cn(
        "size-11 rounded-full text-(--on-surface-variant) hover:bg-(--muted)",
        className,
      )}
      {...props}
    >
      <Icone nome={nome} className="size-6" />
      {children as ReactNode}
    </Button>
  )
}
