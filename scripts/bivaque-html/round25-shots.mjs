import { mkdirSync, readFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "./capture-support.mjs"

// Capturas do alerta de busca (Rodada 25): node round25-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round25/telas")
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
const go = (page, hash) =>
  page.evaluate((h) => {
    location.hash = h
  }, hash)
for (const [width, theme] of [
  [375, "light"],
  [1440, "light"],
  [375, "dark"],
]) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  await page.goto(`${url}#inicio`)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.locator('[data-action="city"]:visible').first().click()
  await page.locator('[data-action="apply-city"]').first().click()
  await page.waitForTimeout(400)
  const tag = `${width}-${theme}`
  await go(page, "imoveis")
  await page.waitForTimeout(600)
  await page.locator('#main [data-action="catalog-toggle"][data-value="pets"]').click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(out, `avise-me-${tag}.png`) })
  await page.locator('#main [data-action="search-alert"]').click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(out, `alerta-ativo-${tag}.png`) })
  await page.locator('#main [data-action="search-alerts"]').click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(out, `lista-alertas-${tag}.png`) })
  await page.keyboard.press("Escape")
  await page.waitForTimeout(400)
  await go(page, "voce")
  await page.waitForTimeout(400)
  await page.locator('[data-action="prototype"]:visible').first().click()
  await page.waitForTimeout(400)
  await page.locator('#dialog [data-action="simulate-alert"]').click()
  await page.waitForTimeout(400)
  await page.keyboard.press("Escape")
  await page.waitForTimeout(400)
  await go(page, "inicio")
  await page.waitForTimeout(500)
  await page.locator('[data-action="notices"]:visible').first().click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(out, `aviso-${tag}.png`) })
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
