"use client"

import { Toast as HeroToast, toast } from "@heroui/react"
import type { ReactNode } from "react"

// HeroUI v3 toast surface, token-tinted, rendered above the bottom nav
// (placement="bottom"). Auto-dismiss, pause-on-hover and Esc dismissal are
// provided by HeroUI's toast queue. Mount this provider once at the shell.
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <HeroToast.Provider placement="bottom" width={360}>
      {children}
    </HeroToast.Provider>
  )
}

interface ToastMessage {
  title: string
  description?: string
  variant?: "default" | "success" | "danger" | "warning"
}

export function showToast({ title, description, variant = "default" }: ToastMessage) {
  const options = description ? { description } : undefined
  switch (variant) {
    case "success":
      toast.success(title, options)
      break
    case "danger":
      toast.danger(title, options)
      break
    case "warning":
      toast.warning(title, options)
      break
    default:
      toast(title, options)
  }
}

export { toast }
