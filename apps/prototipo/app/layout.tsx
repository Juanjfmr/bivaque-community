import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Estrutura } from "@/components/bivaque/estrutura"
import { ProvedorDoBivaque } from "@/components/bivaque/provedor"
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
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-(--primary) focus:px-3 focus:py-2 focus:text-(--primary-foreground)"
        >
          Pular para o conteúdo
        </a>
        <ProvedorDoBivaque>
          <Estrutura>{children}</Estrutura>
        </ProvedorDoBivaque>
      </body>
    </html>
  )
}
