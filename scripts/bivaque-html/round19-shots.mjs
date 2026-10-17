import { mkdirSync, readFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "./capture-support.mjs"

// Capturas do contador com avatares (Rodada 19): node round19-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round19/telas")
mkdirSync(out, { recursive: true })
const html = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const server = createServer((_, res) =>
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(html),
)
await new Promise((done) => server.listen(0, "127.0.0.1", done))
const url = `http://127.0.0.1:${server.address().port}/`
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
)
for (const [width, theme] of [
  [1440, "light"],
  [1440, "dark"],
  [375, "light"],
]) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  await page.goto(`${url}#inicio`)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.locator('[data-action="city"]:visible').first().click()
  await page.locator('[data-action="apply-city"]').first().click()
  await page.waitForTimeout(500)
  if (width >= 1024) await page.screenshot({ path: join(out, `inicio-${width}-${theme}.png`) })
  const id = await page.evaluate(() => {
    const x = JSON.parse(localStorage.getItem("bivaque-material-web-v3"))
    return x.biz
      .filter((b) => b.city === x.homeCity && (b.says || []).length)
      .sort((a, z) => (z.recN || 0) - (a.recN || 0))[0].id
  })
  await page.evaluate((v) => {
    location.hash = `negocio/${v}`
  }, id)
  await page.waitForTimeout(700)
  await page.locator("#main .fact-proof").scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, `negocio-${width}-${theme}.png`) })
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
