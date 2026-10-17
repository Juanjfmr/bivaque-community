import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { chromium } from "playwright"

// Rodada 37: capturas da conversa (não é prova).
const root = process.cwd()
const out = join(root, ".visual/bivaque-html-round37/telas")
mkdirSync(out, { recursive: true })
const url = pathToFileURL(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")).href
const exe = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const browser = await chromium.launch(exe ? { executablePath: exe } : {})

async function shot(name, { width, height = 844, dark = false, hash = "inicio", full = false }) {
  const mobile = width < 720
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    colorScheme: dark ? "dark" : "light",
    reducedMotion: "reduce",
  })
  const page = await ctx.newPage()
  await page.goto(url)
  await page.waitForTimeout(800)
  await page.evaluate(() => document.querySelector('[data-action="city"]')?.click())
  await page.waitForTimeout(300)
  await page.evaluate(() => document.querySelector('[data-action="apply-city"]')?.click())
  await page.waitForTimeout(600)
  await page.evaluate((h) => {
    location.hash = h
  }, hash)
  await page.waitForTimeout(800)
  await page.evaluate(() => document.activeElement?.blur())
  if (full) {
    const h = await page.evaluate(() => document.querySelector("main").scrollHeight)
    await page.setViewportSize({ width, height: Math.min(h + 160, 4000) })
    await page.waitForTimeout(400)
  }
  await page.screenshot({ path: join(out, `${name}.png`) })
  await ctx.close()
}

await shot("conversa-390-claro", { width: 390, hash: "conversa/t1" })
await shot("conversa-390-escuro", { width: 390, hash: "conversa/t1", dark: true })
await shot("conversa-360-claro", { width: 360, hash: "conversa/t1" })
await shot("conversa-1440", { width: 1440, height: 900, hash: "conversa/t1" })
await browser.close()
console.log(`OK: ${out}`)
