"use client"

import { Toast as HeroToast, toast } from "@heroui/react"
import type { ReactNode } from "react"

// HeroUI v3 toast surface, token-tinted, rendered above the bottom nav
// (placement="bottom"). Auto-dismiss, pause-on-hover and Esc dismissal are
// provided by HeroUI's toast queue. Mount this provider once at the shell.
//
// Toast.Provider is a toast *region*, not a context wrapper: it renders the
// queued toasts and nothing else, and its `children` prop is the per-toast
// render template (omitted here so HeroUI renders its default toast). Passing
// the app tree as children hides the whole shell whenever the queue is empty,
// so the region is mounted as a sibling instead.
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <HeroToast.Provider placement="bottom" width={360} />
    </>
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
