import { brandTokens } from "@bivaque/tokens"
import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import type { ReactNode } from "react"
import { ServiceWorkerRegistration } from "./components/bivaque/service-worker-registration"
import { SupabaseAuthProvider } from "./components/bivaque/supabase-auth-provider"
import "./globals.css"

const publicSans = localFont({
  src: [
    {
      path: "./fonts/public-sans-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/public-sans-latin-ext-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  preload: true,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  adjustFontFallback: "Arial",
  variable: "--font-public-sans",
})

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
    <html lang="pt-BR" data-theme="bivaque" className={publicSans.variable}>
      <body className="bg-background text-foreground antialiased">
        <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
