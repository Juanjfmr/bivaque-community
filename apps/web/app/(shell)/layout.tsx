import type { ReactNode } from "react"
import { AppShell } from "../components/bivaque/app-shell"
import { ToastProvider } from "../components/bivaque/toast"

type ShellLayoutProperties = Readonly<{
  children: ReactNode
}>

export default function ShellLayout({ children }: ShellLayoutProperties) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  )
}
