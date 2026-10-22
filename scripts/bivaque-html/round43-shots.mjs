import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { launchCaptureBrowser } from "./capture-support.mjs"

// Rodada 43: folha dos avisos e passo a passo da instalação no iPhone (não é prova).
const root = process.cwd()
const out = join(root, ".visual/bivaque-html-round43/telas")
mkdirSync(out, { recursive: true })
const url = pathToFileURL(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")).href
const browser = await launchCaptureBrowser()
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
})
const page = await ctx.newPage()
await page.goto(url)
await page.waitForTimeout(800)
await page.evaluate(() => document.querySelector('[data-action="city"]')?.click())
await page.waitForTimeout(300)
await page.evaluate(() => document.querySelector('[data-action="apply-city"]')?.click())
await page.waitForTimeout(600)
const go = async (h) => {
  await page.evaluate((x) => {
    location.hash = x
  }, h)
  await page.waitForTimeout(900)
}
await go("imoveis")
await page.evaluate(() =>
  document.querySelector('#main [data-action="catalog-toggle"][data-value="pets"]').click(),
)
await page.waitForTimeout(500)
await page.evaluate(() => document.querySelector('#main [data-action="search-alert"]').click())
await page.waitForTimeout(1800)
await page.screenshot({ path: join(out, "avisos.png") })
await page.evaluate(() => document.querySelector('#dialog [data-action="push-later"]').click())
await page.waitForTimeout(800)
await go("voce")
await page.screenshot({ path: join(out, "voce-avisos.png"), fullPage: false })
await page.evaluate(() => document.querySelector('#main [data-action="install-app"]').click())
await page.waitForTimeout(900)
await page.screenshot({ path: join(out, "instalar-iphone.png") })
await browser.close()
console.log(`OK: ${out}`)
