import { mkdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createDeterministicContext, startCapture } from "./capture-support.mjs"

// Capturas do selo verificado (Rodada 28): node round28-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round28/telas")
mkdirSync(out, { recursive: true })
const html = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const { server, url, browser } = await startCapture(html)
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
  await page.evaluate(() => {
    location.hash = "anuncio/i1"
  })
  await page.waitForTimeout(700)
  await page.locator('#main [data-action="verified-info"]').scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(out, `selo-${width}-${theme}.png`) })
  await page.locator('#main [data-action="verified-info"]').click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(out, `explicacao-${width}-${theme}.png`) })
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
