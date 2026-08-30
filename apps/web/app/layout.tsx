import { brandTokens } from "@bivaque/tokens"
import type { Metadata, Viewport } from "next"
import { Noto_Sans, Noto_Serif } from "next/font/google"
import type { ReactNode } from "react"
import { ServiceWorkerRegistration } from "./components/bivaque/service-worker-registration"
import { SupabaseAuthProvider } from "./components/bivaque/supabase-auth-provider"
import "./globals.css"

// As duas famílias da identidade oficial (packages/tokens/src/official-brand.ts),
// auto-hospedadas pelo next/font em tempo de build: o navegador nunca pede fonte
// a servidor de terceiro, então nenhuma requisição de visitante sai para o
// Google (LGPD), e não há stylesheet externo bloqueando o render.
//
// Antes desta entrega, `Inter` era nomeada nas três pilhas de fonte do funil sem
// nenhum next/font — o que aparecia era Segoe UI ou Arial conforme o sistema
// operacional. E o serifado era stack de sistema ("Iowan Old Style", Palatino,
// Georgia), ou seja, a identidade mudava de máquina para máquina.
// Sem `weight`: as duas são fontes variáveis no Google Fonts, e omitir o peso é
// o que faz o next/font baixar o eixo variável inteiro (font-weight: 100 900)
// em vez de instâncias estáticas. Declarar ["400","500","600","700"] aqui, como
// esta chamada fazia, desligava a variável e gerava 64 declarações @font-face
// estáticas contra as 8 do sans — assimetria que era omissão minha, mas ao
// contrário do que parecia: o lado errado era o serifado, não o sans.
const notoSerif = Noto_Serif({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-noto-serif",
  style: ["normal", "italic"],
})

const notoSans = Noto_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-noto-sans",
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
    <html
      lang="pt-BR"
      data-theme="bivaque"
      className={`${notoSerif.variable} ${notoSans.variable}`}
    >
      <body className="bg-background text-foreground antialiased">
        <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
