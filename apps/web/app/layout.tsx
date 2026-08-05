import { brandTokens } from "@bivaque/tokens"
import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import { ServiceWorkerRegistration } from "./components/bivaque/service-worker-registration"
import { SupabaseAuthProvider } from "./components/bivaque/supabase-auth-provider"
import "./globals.css"

export const metadata: Metadata = {
  applicationName: brandTokens.productName,
  description: "Comunidade privada Bivaque.",
  title: brandTokens.productName,
  manifest: "/api/manifest",
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
        <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
