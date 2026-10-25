import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeShell } from "@/components/theme-shell";
import "./globals.css";

const notoSans = localFont({ src: "../public/fonts/noto-sans.woff2", display: "swap", variable: "--font-noto-sans", weight: "100 900" });
const notoSerif = localFont({ src: "../public/fonts/noto-serif.woff2", display: "swap", variable: "--font-noto-serif", weight: "100 900" });

export const metadata: Metadata = {
  title: "Bivaque — Laboratório shadcn/ui",
  description: "Exploração dos módulos com a identidade oficial Bivaque e componentes shadcn/ui.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR" suppressHydrationWarning>
    <body className={`${notoSans.variable} ${notoSerif.variable} font-sans antialiased`}>
      <ThemeShell>{children}</ThemeShell>
    </body>
  </html>;
}
