import { mkdirSync, readFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "./capture-support.mjs"

// Capturas dos filtros com indicador deslizante (Rodada 21): node round21-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round21/telas")
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
  [375, "light"],
  [375, "dark"],
  [1440, "light"],
]) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.goto(`${url}#inicio`)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.locator('[data-action="city"]:visible').first().click()
  await page.locator('[data-action="apply-city"]').first().click()
  await page.waitForTimeout(400)
  for (const [hash, action, value] of [
    ["catalogo", "catalog-filter", "imovel"],
    ["comunidade", "question-filter", "ok"],
  ]) {
    await page.evaluate((h) => {
      location.hash = h
    }, hash)
    await page.waitForTimeout(700)
    await page.screenshot({ path: join(out, `${hash}-antes-${width}-${theme}.png`) })
    await page.locator(`[data-action="${action}"][data-value="${value}"]`).click()
    await page.waitForTimeout(140)
    await page.screenshot({ path: join(out, `${hash}-meio-${width}-${theme}.png`) })
    await page.waitForTimeout(500)
    await page.screenshot({ path: join(out, `${hash}-depois-${width}-${theme}.png`) })
  }
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
