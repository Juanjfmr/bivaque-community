"use client"

import { Select as SelectPrimitive } from "radix-ui"
import type * as React from "react"

import { Icone } from "@/components/bivaque/icone"
import { cn } from "@/lib/utils"

/**
 * A seleção do inventário §7 (`selectField`): uma lista de opções com rótulo,
 * no Radix. Os ícones do gatilho e do item marcado são Material Symbols locais,
 * como o resto do app — nenhum pacote de ícones entra por aqui.
 */

const Select = SelectPrimitive.Root
const SelectValue = SelectPrimitive.Value

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-(--input) bg-transparent px-3 py-2 text-left text-base outline-none focus-visible:border-(--ring) focus-visible:ring-3 focus-visible:ring-(--ring)/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    >
      {children}
      <Icone nome="expand_more" className="size-5 shrink-0 opacity-70" />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position="popper"
        sideOffset={4}
        className={cn(
          "z-60 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-xl border border-(--outline-variant) bg-(--popover) p-1 text-(--popover-foreground) shadow-[0_8px_24px_var(--shadow-soft)]",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "flex min-h-11 cursor-default items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm outline-none select-none data-[highlighted]:bg-(--muted) data-[state=checked]:font-medium",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator>
        <Icone nome="check" className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
