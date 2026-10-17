import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { chromium } from "playwright"

// Rodada 38: anúncio e negócio com a foto até o topo (não é prova).
const root = process.cwd()
const out = join(root, ".visual/bivaque-html-round38/telas")
mkdirSync(out, { recursive: true })
const url = pathToFileURL(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")).href
const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const browser = await chromium.launch(exe ? { executablePath: exe } : {})
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
})
const page = await ctx.newPage()
await page.goto(url)
await page.waitForTimeout(800)
await page.evaluate(() => document.querySelector('[data-action="city"]')?.click())
await page.waitForTimeout(300)
await page.evaluate(() => document.querySelector('[data-action="apply-city"]')?.click())
await page.waitForTimeout(600)
for (const hash of ["anuncio/i2", "negocio/b4"]) {
  await page.evaluate((h) => {
    location.hash = h
  }, hash)
  await page.waitForTimeout(800)
  await page.evaluate(() => document.activeElement?.blur())
  await page.screenshot({
    path: join(out, `${hash.replace("/", "-")}-topo.png`),
    clip: { x: 0, y: 0, width: 390, height: 844 },
  })
  await page.evaluate(() => {
    const m = document.querySelector("main")
    m.style.scrollBehavior = "auto"
    m.scrollTop = 360
    m.dispatchEvent(new Event("scroll"))
  })
  await page.waitForTimeout(400)
  await page.screenshot({
    path: join(out, `${hash.replace("/", "-")}-rolada.png`),
    clip: { x: 0, y: 0, width: 390, height: 844 },
  })
}
await browser.close()
console.log(`OK: ${out}`)
