import { brandTokens } from "@bivaque/tokens"
import type { Metadata, Viewport } from "next"
import { LandingPage } from "./landing/landing"

export const metadata: Metadata = {
  title: `${brandTokens.productName} — A comunidade vai com você`,
  description:
    "Comunidade privada de acesso controlado que reúne militares federais, veteranos, pensionistas e dependentes para trocar ajuda, encontrar referências e preservar o que aprenderam juntos.",
  keywords: [
    "comunidade militar",
    "veteranos",
    "militares federais",
    "pensionistas",
    "pertencimento",
    "comunidade privada",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${brandTokens.productName} — A comunidade vai com você`,
    description: "Comunidade privada de pertencimento para quem compartilha uma trajetória.",
    type: "website",
    locale: "pt_BR",
    siteName: brandTokens.productName,
  },
}

export const viewport: Viewport = {
  themeColor: brandTokens.color.accent,
}

export default function HomePage() {
  return <LandingPage />
}
