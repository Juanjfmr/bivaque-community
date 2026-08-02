import { brandTokens } from "@bivaque/tokens"
import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { AppShell } from "./components/bivaque/app-shell"
import "./globals.css"

export const metadata: Metadata = {
  applicationName: brandTokens.productName,
  description: "Comunidade privada Bivaque.",
  title: brandTokens.productName,
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: brandTokens.color.background,
}

type RootLayoutProperties = Readonly<{
  children: ReactNode
}>

export default function RootLayout({ children }: RootLayoutProperties) {
  return (
    <html lang="pt-BR" data-theme="bivaque">
      <body className="bg-background text-foreground antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
