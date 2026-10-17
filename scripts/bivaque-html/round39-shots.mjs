import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { chromium } from "playwright"

// Rodada 39: linha de conversa aberta pelo deslizar (não é prova).
const root = process.cwd()
const out = join(root, ".visual/bivaque-html-round39/telas")
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
  location.hash = "conversas"
})
await page.waitForTimeout(800)
const box = await page.locator("#main .swipe-row .swipe-content").first().boundingBox()
const y = box.y + box.height / 2
const x = box.x + box.width * 0.6
await page.mouse.move(x, y)
await page.mouse.down()
for (const dx of [20, 60, 120, 180, 230]) await page.mouse.move(x - dx, y)
await page.mouse.up()
await page.waitForTimeout(500)
await page.screenshot({
  path: join(out, "conversas-deslizar.png"),
  clip: { x: 0, y: 0, width: 390, height: 520 },
})
await browser.close()
console.log(`OK: ${out}`)
