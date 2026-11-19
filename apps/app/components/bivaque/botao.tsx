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

// A ação de concluir é ardósia (ADR-20261118): a Brasa fica só no começar a
// criar (FAB e Criar da barra), que são peças da casca, não este botão.
const VARIANTE: Record<TomDoBotao, "default" | "secondary" | "ghost" | "outline" | "destructive"> =
  {
    preenchido: "default",
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
  // Ícone cheio só quando o botão está ligado (Útil marcado, salvo).
  const ligado = props["aria-pressed"] === true || props["aria-pressed"] === "true"
  return (
    <Button
      data-tom={tom}
      variant={VARIANTE[tom]}
      // O protótipo usa 44 px de altura em todo botão (base.css:16).
      className={cn(
        "min-h-11 rounded-xl px-4 text-sm",
        tom === "preenchido" &&
          "bg-(--acao) text-(--acao-foreground) hover:bg-(--acao)/90 focus-visible:ring-(--acao)/40",
        className,
      )}
      {...props}
    >
      {icone === undefined ? null : <Icone nome={icone} preenchido={ligado} />}
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
  // Mesma regra do `Botao`: o ícone só é cheio quando o botão está ligado.
  const ligado = props["aria-pressed"] === true || props["aria-pressed"] === "true"
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
      <Icone nome={nome} preenchido={ligado} className="size-6" />
      {children as ReactNode}
    </Button>
  )
}
