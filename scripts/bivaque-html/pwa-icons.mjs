import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "playwright"

// Rodada 43: gera os ícones do app instalável a partir da marca do protótipo (o mesmo desenho do
// favicon) e o manifesto. Saída em prototypes/bivaque-html/pwa/; o deploy publica ao lado do HTML.
const out = join(process.cwd(), "prototypes/bivaque-html/pwa")
const B =
  "M20 14h17c8 0 13 4 13 11 0 4-2 7-6 9 5 2 8 6 8 12 0 8-6 13-15 13H20V14Zm11 9v8h5c3 0 5-1 5-4s-2-4-5-4h-5Zm0 17v10h6c4 0 6-2 6-5s-2-5-6-5h-6Z"
// Ícone comum: quadrado arredondado. Maskable: fundo cheio e a letra dentro da área segura (80%).
const svg = (maskable) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${maskable ? '<rect width="64" height="64" fill="#2f7654"/><g transform="translate(9.6 9.6) scale(.7)">' : '<rect width="64" height="64" rx="14" fill="#2f7654"/><g>'}<path d="${B}" fill="#f7f6ef"/></g></svg>`
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
)
const page = await browser.newPage()
for (const [name, size, maskable] of [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg(maskable)}`,
  )
  await page.screenshot({ path: join(out, name), omitBackground: true })
}
await browser.close()
const manifest = {
  name: "Bivaque — protótipo",
  short_name: "Bivaque",
  description:
    "Serviços, oportunidades e indicações entre militares e famílias, cidade por cidade.",
  lang: "pt-BR",
  start_url: "./",
  scope: "./",
  display: "standalone",
  background_color: "#f8fafb",
  theme_color: "#f8fafb",
  icons: [
    { src: "icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}
writeFileSync(join(out, "manifest.webmanifest"), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`OK: ${out}`)
