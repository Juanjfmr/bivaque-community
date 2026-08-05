import type { ReactNode } from "react"
import { AppShell } from "../components/bivaque/app-shell"

type ShellLayoutProperties = Readonly<{
  children: ReactNode
}>

export default function ShellLayout({ children }: ShellLayoutProperties) {
  return <AppShell>{children}</AppShell>
}
