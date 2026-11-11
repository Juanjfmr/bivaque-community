"use client"

// Fonte: Credenza, de redpangilinan (https://21st.dev/@redpangilinan/components/credenza).
// Folha que sobe no celular e diálogo no computador, com a mesma API. Código do
// autor; adaptações: o gancho de mídia é o do app (`useStateComMidia`), o ponto
// de troca é 768 px como no DESIGN.md §12, e `asChild` passa a ser opcional nas
// partes que o aceitam.
import type * as React from "react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { useStateComMidia } from "@/src/casca/midia"

interface BaseProps {
  children: React.ReactNode
}

interface RootCredenzaProps extends BaseProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface CredenzaProps extends BaseProps {
  className?: string
  asChild?: boolean
}

const desktop = "(min-width: 768px)"

const Credenza = ({ children, ...props }: RootCredenzaProps) => {
  const isDesktop = useStateComMidia(desktop)
  const Raiz = isDesktop ? Dialog : Drawer

  return <Raiz {...props}>{children}</Raiz>
}

const CredenzaTrigger = ({ className, children, ...props }: CredenzaProps) => {
  const isDesktop = useStateComMidia(desktop)
  const Gatilho = isDesktop ? DialogTrigger : DrawerTrigger

  return (
    <Gatilho className={className} {...props}>
      {children}
    </Gatilho>
  )
}

const CredenzaClose = ({ className, children, ...props }: CredenzaProps) => {
  const isDesktop = useStateComMidia(desktop)
  const Fechar = isDesktop ? DialogClose : DrawerClose

  return (
    <Fechar className={className} {...props}>
      {children}
    </Fechar>
  )
}

const CredenzaContent = ({ className, children }: Omit<CredenzaProps, "asChild">) => {
  const isDesktop = useStateComMidia(desktop)
  if (isDesktop) return <DialogContent className={className}>{children}</DialogContent>
  return <DrawerContent className={className}>{children}</DrawerContent>
}

const CredenzaDescription = ({ className, children }: Omit<CredenzaProps, "asChild">) => {
  const isDesktop = useStateComMidia(desktop)
  const Descricao = isDesktop ? DialogDescription : DrawerDescription

  return <Descricao className={className}>{children}</Descricao>
}

const CredenzaHeader = ({ className, children }: Omit<CredenzaProps, "asChild">) => {
  const isDesktop = useStateComMidia(desktop)
  const Cabeca = isDesktop ? DialogHeader : DrawerHeader

  return <Cabeca className={className}>{children}</Cabeca>
}

const CredenzaTitle = ({ className, children }: Omit<CredenzaProps, "asChild">) => {
  const isDesktop = useStateComMidia(desktop)
  const Titulo = isDesktop ? DialogTitle : DrawerTitle

  return <Titulo className={className}>{children}</Titulo>
}

const CredenzaBody = ({ className, children }: Omit<CredenzaProps, "asChild">) => {
  return <div className={cn("px-5 md:px-0", className)}>{children}</div>
}

const CredenzaFooter = ({ className, children }: Omit<CredenzaProps, "asChild">) => {
  const isDesktop = useStateComMidia(desktop)
  const Rodape = isDesktop ? DialogFooter : DrawerFooter

  return <Rodape className={className}>{children}</Rodape>
}

export {
  Credenza,
  CredenzaBody,
  CredenzaClose,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
}
