import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { launchCaptureBrowser } from "./capture-support.mjs"

// Auditoria do protótipo no celular: captura as telas principais em 390x844 (tela cheia
// rolável) e as mesmas rotas em 1440 para comparar. Não é prova; só gera as imagens.
const root = process.cwd()
const out = join(root, ".visual/bivaque-html-mobile-audit")
mkdirSync(out, { recursive: true })
const url = pathToFileURL(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")).href
const routes = [
  "inicio",
  "imoveis",
  "desapegos",
  "anuncio/i2",
  "negocio/b4",
  "comunidade",
  "agenda",
  "conversas",
  "conversa/t1",
  "voce",
  "guia",
  "salvos",
]
const browser = await launchCaptureBrowser()
for (const [w, h, mobile] of [
  [390, 844, true],
  [1440, 900, false],
]) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: "reduce",
  })
  const page = await ctx.newPage()
  await page.goto(url)
  await page.waitForTimeout(800)
  await page.evaluate(() => document.querySelector('[data-action="city"]')?.click())
  await page.waitForTimeout(300)
  await page.evaluate(() => document.querySelector('[data-action="apply-city"]')?.click())
  await page.waitForTimeout(500)
  await page.evaluate(() => document.querySelector("#dialog")?.close?.())
  for (const r of routes) {
    await page.evaluate((h) => {
      location.hash = h
    }, r)
    await page.waitForTimeout(700)
    await page.screenshot({
      path: join(out, `${r.replace("/", "-")}-${w}.png`),
      fullPage: false,
    })
    if (mobile) {
      await page.evaluate(() => {
        const s =
          document.querySelector("#main")?.closest("[data-scroll], main, .content") ||
          document.scrollingElement
        s.scrollTop = s.scrollHeight
        window.scrollTo(0, document.body.scrollHeight)
      })
      await page.waitForTimeout(400)
      await page.screenshot({ path: join(out, `${r.replace("/", "-")}-${w}-fim.png`) })
    }
  }
  await ctx.close()
}
await browser.close()
console.log(`OK: ${out}`)
