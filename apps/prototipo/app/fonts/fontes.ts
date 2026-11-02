import localFont from "next/font/local"

// As duas famílias do protótipo, self-hosted a partir dos mesmos arquivos que o
// `apps/web` já usa (`apps/web/app/fonts/`). Nenhuma fonte vem de serviço
// externo. O ícone do protótipo (Material Symbols) não entra: aqui os ícones são
// do `lucide-react`.
export const notoSans = localFont({
  src: "./noto-sans-latin-wght-normal.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
  variable: "--font-noto-sans",
})

export const notoSerif = localFont({
  src: "./noto-serif-latin-600-normal.woff2",
  weight: "600",
  style: "normal",
  display: "swap",
  preload: true,
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
  variable: "--font-noto-serif",
})
