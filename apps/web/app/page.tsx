import { brandTokens } from "@bivaque/tokens"
import type { Metadata, Viewport } from "next"
import { LandingPage } from "./landing/landing"

// PORT-001 (R73): os metadados da landing v8. O título e a descrição saem do
// próprio texto aprovado ("Juntos somos mais fortes." e a linha de apoio).
const TITLE = `${brandTokens.productName} — Juntos somos mais fortes`
const DESCRIPTION =
  "A família militar se ajuda, em qualquer cidade: pergunte a quem já mora perto, ache serviços e imóveis, passe adiante o que não usa mais. Gratuito para militares, veteranos, pensionistas e suas famílias."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "família militar",
    "comunidade militar",
    "veteranos",
    "pensionistas",
    "mudança de cidade",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "pt_BR",
    siteName: brandTokens.productName,
  },
}

// ADR-20261022 (porte visual) e ADR-20261020 (identidade visual e tema escuro):
// a barra do navegador da landing acompanha o tema do sistema. O par são as
// superfícies dos dois temas declaradas em brand-tokens.css, e não o verde do
// adapter nos dois — por isso a lista com `media` no lugar do valor único.
// As outras telas continuam com o `themeColor` do layout raiz.
export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F0EB" },
    { media: "(prefers-color-scheme: dark)", color: "#171E20" },
  ],
}

export default function HomePage() {
  return <LandingPage />
}
