import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { chromium } from "playwright"

// Rodada 40: galeria arrastando para baixo e ampliada (não é prova).
const root = process.cwd()
const out = join(root, ".visual/bivaque-html-round40/telas")
mkdirSync(out, { recursive: true })
const url = pathToFileURL(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")).href
const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const browser = await chromium.launch(exe ? { executablePath: exe } : {})
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
})
const page = await ctx.newPage()
await page.goto(url)
await page.waitForTimeout(800)
await page.evaluate(() => document.querySelector('[data-action="city"]')?.click())
await page.waitForTimeout(300)
await page.evaluate(() => document.querySelector('[data-action="apply-city"]')?.click())
await page.waitForTimeout(600)
await page.evaluate(() => {
  const k = "bivaque-material-web-v3"
  const x = JSON.parse(localStorage.getItem(k))
  x.items.find((i) => i.id === "i2").photos = x.items
    .map((i) => i.photos?.[0])
    .filter(Boolean)
    .slice(0, 3)
  localStorage.setItem(k, JSON.stringify(x))
})
await page.reload()
await page.waitForTimeout(900)
await page.evaluate(() => {
  location.hash = "anuncio/i2"
})
await page.waitForTimeout(800)
await page.locator('#main [data-action="lightbox"]').first().click()
await page.waitForTimeout(800)
const fire = (steps) =>
  page.evaluate((steps) => {
    const stage = document.querySelector("#lightbox .lightbox-stage")
    const r = stage.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    for (const [type, dx, dy] of steps)
      stage.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          pointerType: "touch",
          clientX: cx + dx,
          clientY: cy + dy,
          bubbles: true,
        }),
      )
  }, steps)
await fire([
  ["pointerdown", 0, 0],
  ["pointermove", 0, 20],
  ["pointermove", 0, 150],
])
await page.waitForTimeout(200)
await page.screenshot({ path: join(out, "galeria-arrastando.png") })
await fire([["pointercancel", 0, 150]])
await page.waitForTimeout(300)
await fire([
  ["pointerdown", 0, 0],
  ["pointerup", 0, 0],
  ["pointerdown", 0, 0],
  ["pointerup", 0, 0],
])
await page.waitForTimeout(400)
await page.screenshot({ path: join(out, "galeria-ampliada.png") })
await browser.close()
console.log(`OK: ${out}`)
