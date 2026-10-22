import localFont from "next/font/local"

// PORT-001 (R73): as três famílias da landing v8, self-hosted a partir dos
// mesmos arquivos que o protótipo embute (ADR-20261022, item 2). Nenhuma fonte
// vem de CDN, e só a Noto Sans e a Noto Serif são pré-carregadas.
//
// Os arquivos ficam neste diretório porque `next/font/local` resolve `src`
// relativo ao módulo que chama a função.
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

// Ícone não é texto: sem fallback ajustado e sem preload, para a página não
// pagar o arquivo antes de saber que a folha do menu existe. `display: block`
// evita o nome da ligadura aparecer antes da fonte.
export const materialSymbols = localFont({
  src: "./material-symbols-outlined-subset.woff2",
  weight: "400",
  style: "normal",
  display: "block",
  preload: false,
  adjustFontFallback: false,
  variable: "--font-material-symbols",
})
