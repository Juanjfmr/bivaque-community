import { mkdirSync, readFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"

// Captura da microanimação ao indicar (Rodada 34): node round34-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round34/telas")
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
// Contexto comum: o determinístico congela as animações CSS que esta captura quer mostrar.
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
await page.emulateMedia({ reducedMotion: "no-preference" })
await page.goto(`${url}#inicio`)
await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
await page.locator('[data-action="city"]:visible').first().click()
await page.locator('[data-action="apply-city"]').first().click()
await page.waitForTimeout(400)
await page.evaluate(() => {
  location.hash = "negocio/b1"
})
await page.waitForTimeout(700)
await page.locator('#main [data-action="recommend-biz"]').click()
await page.waitForTimeout(500)
await page.locator("#recommend-why textarea").fill("Atendimento rápido e preço combinado.")
await page.locator('#dialog [data-action="submit-recommend"]').click()
await page.waitForSelector(".burst i")
// Congela as animações em 250 ms para a foto mostrar o meio do movimento.
await page.evaluate(() => {
  for (const a of document.getAnimations()) {
    a.pause()
    a.currentTime = 250
  }
})
await page.screenshot({
  path: join(out, "indicar-1440.png"),
  clip: { x: 940, y: 100, width: 420, height: 260 },
})
await context.close()
await browser.close()
server.close()
console.log(`OK: ${out}`)
