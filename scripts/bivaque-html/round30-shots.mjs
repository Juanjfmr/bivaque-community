import { mkdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createDeterministicContext, startCapture } from "./capture-support.mjs"

// Capturas da comparação de imóveis salvos (Rodada 30): node round30-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round30/telas")
mkdirSync(out, { recursive: true })
const html = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const { server, url, browser } = await startCapture(html)
for (const [width, theme] of [
  [375, "light"],
  [1440, "light"],
  [1440, "dark"],
]) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  await page.goto(`${url}#inicio`)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.locator('[data-action="city"]:visible').first().click()
  await page.locator('[data-action="apply-city"]').first().click()
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    const k = "bivaque-material-web-v3"
    const x = JSON.parse(localStorage.getItem(k))
    for (const i of x.items) i.saved = ["i2", "i5", "i7"].includes(i.id)
    localStorage.setItem(k, JSON.stringify(x))
  })
  await page.reload()
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.evaluate(() => {
    location.hash = "salvos"
  })
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(out, `salvos-${width}-${theme}.png`) })
  await page.locator('#main [data-action="compare-saved"]').click()
  await page.waitForTimeout(700)
  await page.screenshot({ path: join(out, `comparar-${width}-${theme}.png`) })
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
