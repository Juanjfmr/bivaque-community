import { brandTokens } from "@bivaque/tokens"
import type { Metadata, Viewport } from "next"
import { Fraunces } from "next/font/google"
import { LandingPage } from "./landing/landing"

// Fraunces como display serif editorial, self-hosted no build — mesmo padrão
// de apps/web/app/experimento/page.tsx. A variável é consumida por
// landing.module.css via var(--font-fraunces); se a busca do Google Fonts
// falhar no build, o Next derruba o build e o CSS cai para Public Sans
// (carregada no layout raiz). Zero request externo em runtime (OFL 1.1).
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["SOFT", "opsz"],
})

export const metadata: Metadata = {
  title: "Bivaque — Muda a cidade. Fica a sua rede.",
  description:
    "A remoção chega, o endereço muda — e o que sustenta a sua vida não precisa começar do zero. O Bivaque reúne o guia da nova cidade, as comunidades locais e gente que já fez esse caminho.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Bivaque — Muda a cidade. Fica a sua rede.",
    description:
      "A remoção chega, o endereço muda — e o que sustenta a sua vida não precisa começar do zero.",
    type: "website",
    locale: "pt_BR",
    siteName: brandTokens.productName,
    images: [
      {
        url: "/landing/chegada-editorial.webp",
        width: 1536,
        height: 1024,
        alt: "Um novo lugar. Um primeiro olá. Bivaque.",
      },
    ],
  },
}

export const viewport: Viewport = { themeColor: brandTokens.color.accent }

export default function HomePage() {
  return (
    <div className={fraunces.variable}>
      <LandingPage />
    </div>
  )
}
