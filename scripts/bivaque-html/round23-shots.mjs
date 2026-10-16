import { mkdirSync, readFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "./capture-support.mjs"

// Capturas dos filtros em pílulas (Rodada 23): node round23-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round23/telas")
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
const errors = []
const pill = (page, key) => page.locator(`#main [data-action="catalog-pill"][data-value="${key}"]`)
const panel = (page) => page.locator("#filter-panel")
for (const [width, theme] of [
  [375, "light"],
  [1440, "light"],
  [375, "dark"],
]) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  page.on("pageerror", (e) => errors.push(`${width}: ${e.message}`))
  await page.goto(`${url}#inicio`)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.locator('[data-action="city"]:visible').first().click()
  await page.locator('[data-action="apply-city"]').first().click()
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    location.hash = "imoveis"
  })
  await page.waitForTimeout(700)
  const tag = `${width}-${theme}`
  await page.screenshot({ path: join(out, `imoveis-${tag}.png`) })
  // Preço: faixa pronta "Até R$ 3.000".
  await pill(page, "price").click()
  await page.waitForTimeout(350)
  await panel(page).locator('[data-f="quick"][data-v="3000"]').click()
  await page.waitForTimeout(250)
  await page.screenshot({ path: join(out, `preco-${tag}.png`) })
  await panel(page).locator('[data-f="apply"]').click()
  await page.waitForTimeout(400)
  // Quartos: 2+.
  await pill(page, "beds").click()
  await page.waitForTimeout(350)
  await panel(page).locator('[data-field="beds"][data-v="2"]').click()
  await page.waitForTimeout(250)
  await page.screenshot({ path: join(out, `quartos-${tag}.png`) })
  await panel(page).locator('[data-f="apply"]').click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(out, `imoveis-filtrados-${tag}.png`) })
  await pill(page, "all").click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(out, `todos-${tag}.png`) })
  await panel(page).locator('[data-f="close"]').click()
  await page.evaluate(() => {
    location.hash = "desapegos"
  })
  await page.waitForTimeout(700)
  await page.screenshot({ path: join(out, `desapegos-${tag}.png`) })
  await context.close()
}
await browser.close()
server.close()
console.log(errors.length ? `ERROS:\n${errors.join("\n")}` : `OK: ${out}`)
