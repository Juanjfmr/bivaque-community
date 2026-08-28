import { brandTokens } from "@bivaque/tokens"
import type { Metadata, Viewport } from "next"
import { Inter, Literata } from "next/font/google"
import type { ReactNode } from "react"
import { ServiceWorkerRegistration } from "./components/bivaque/service-worker-registration"
import { SupabaseAuthProvider } from "./components/bivaque/supabase-auth-provider"
import "./globals.css"

// Both families are self-hosted by next/font at build time: the browser never
// requests a third-party font server, so no visitor request leaves for Google
// (LGPD), and there is no render-blocking external stylesheet.
//
// Literata is the display face. The funnel already committed to an old-style
// serif ("Iowan Old Style", Palatino, Georgia) but only as a system stack, so
// what a visitor actually saw depended on their OS — Georgia on most Windows
// machines, nothing consistent. Literata is a real screen serif in that same
// old-style family, so the identity is now the same on every device.
const literata = Literata({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-literata",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
})

// Inter is the UI workhorse. It was already named in the funnel's font stack
// but never loaded, so every screen silently fell back to Segoe UI or Arial.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-inter",
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
    <html lang="pt-BR" data-theme="bivaque" className={`${literata.variable} ${inter.variable}`}>
      <body className="bg-background text-foreground antialiased">
        <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
