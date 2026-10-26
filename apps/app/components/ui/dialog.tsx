"use client"

import { Dialog as DialogPrimitive } from "radix-ui"
import type * as React from "react"

import { Icone } from "@/components/bivaque/icone"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Portado do componente shadcn já existente em apps/prototipo/components/ui/dialog.tsx.
// Mantém a anatomia oficial; somente o ícone e as classes de marca são do Bivaque.
function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      data-scrim="sobreposicao"
      className={cn("bv-scrim", className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  overlayClassName,
  children,
  showCloseButton = true,
  unstyled = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /** Classes adicionais do fundo; o overlay continua único e preso ao Portal. */
  overlayClassName?: string
  /** O shell R72 fornece as três geometrias próprias: folha, diálogo e gaveta. */
  unstyled?: boolean
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          !unstyled &&
            "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-(--popover) p-4 text-sm text-(--popover-foreground) ring-1 ring-(--outline-variant) outline-none sm:max-w-sm",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 size-11 rounded-full"
              aria-label="Fechar diálogo"
            >
              <Icone nome="close" className="size-5" />
            </Button>
          </DialogClose>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="dialog-footer" className={cn("flex flex-wrap justify-end gap-2", className)} {...props} />
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-6 font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-(--on-surface-variant)", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
