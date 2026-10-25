import type { Metadata } from "next"
import type { ReactNode } from "react"
import { notoSans, notoSerif } from "./fonts/fontes"
import "./globals.css"

export const metadata: Metadata = {
  title: "Bivaque — protótipo",
  description:
    "Protótipo do Bivaque em Next e shadcn/ui. A jornada das Indicações, com dados de demonstração.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${notoSans.variable} ${notoSerif.variable}`}>
      <body>{children}</body>
    </html>
  )
}
