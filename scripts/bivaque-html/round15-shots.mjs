import { readFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "./capture-support.mjs"

// Capturas da linha do tempo do plano (Rodada 15): node round15-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round15/telas")
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
const KEY = "bivaque-material-web-v3"
for (const [width, theme, mode] of [
  [375, "light", "chegando"],
  [1440, "light", "chegando"],
  [1440, "dark", "saindo"],
]) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  await page.goto(`${url}#inicio`)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.locator('[data-action="city"]:visible').first().click()
  await page.locator('[data-action="apply-city"]').first().click()
  await page.waitForTimeout(400)
  await page.evaluate(
    ([k, m]) => {
      const x = JSON.parse(localStorage.getItem(k))
      x.mode = m
      x.plan[m].forEach((s, i) => {
        s.done = i === 0
      })
      localStorage.setItem(k, JSON.stringify(x))
    },
    [KEY, mode],
  )
  await page.reload()
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.waitForTimeout(800)
  await page.locator("#main .plan-card").scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(out, `plano-${mode}-${width}-${theme}.png`) })
  if (width === 1440 && theme === "light") {
    await page.locator('#main [data-action="plan"]').click()
    await page.waitForTimeout(700)
    await page.screenshot({ path: join(out, `plano-completo-${width}.png`) })
  }
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
