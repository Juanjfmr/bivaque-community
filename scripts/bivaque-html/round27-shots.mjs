import { mkdirSync, readFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "./capture-support.mjs"

// Capturas do anúncio de imóvel em etapas (Rodada 27): node round27-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round27/telas")
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
const pick = async (page, id, value) => {
  await page.locator(`#${id}`).click()
  await page.locator(`#${id} md-select-option[value="${value}"]`).click()
  await page.waitForTimeout(250)
}
const type = (page, id, text) => page.locator(`#${id} input, #${id} textarea`).first().fill(text)
const next = async (page) => {
  await page.locator('#dialog [data-action="wiz-next"]').click()
  await page.waitForTimeout(400)
}
for (const [width, theme] of [
  [375, "light"],
  [1440, "light"],
]) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  await page.goto(`${url}#inicio`)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.locator('[data-action="city"]:visible').first().click()
  await page.locator('[data-action="apply-city"]').first().click()
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    location.hash = "imoveis"
  })
  await page.waitForTimeout(600)
  await page.locator('#main [data-action="create-property"]').click()
  await page.waitForTimeout(700)
  const tag = `${width}-${theme}`
  await pick(page, "item-ptype", "Casa")
  await type(page, "item-title", "Casa 3 quartos com quintal")
  await pick(page, "item-hood", "Parque 10")
  await type(page, "item-beds", "3")
  await type(page, "item-area", "140")
  await type(page, "item-parking", "2")
  await page.screenshot({ path: join(out, `passo1-${tag}.png`) })
  await next(page)
  await type(page, "item-price", "2600")
  await type(page, "item-condo", "300")
  await page.screenshot({ path: join(out, `passo2-${tag}.png`) })
  await next(page)
  await page.locator('#item-amen md-filter-chip[data-value="pets"]').click()
  await type(page, "item-desc", "Casa térrea com quintal, perto de escola e mercado.")
  await next(page)
  await next(page)
  await page.screenshot({ path: join(out, `revisao-${tag}.png`) })
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
