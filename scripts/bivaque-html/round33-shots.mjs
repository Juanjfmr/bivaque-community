import { mkdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createDeterministicContext, startCapture } from "./capture-support.mjs"

// Capturas dos avisos empilhados (Rodada 33): node round33-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round33/telas")
mkdirSync(out, { recursive: true })
const html = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const { server, url, browser } = await startCapture(html)
for (const [width, theme] of [
  [375, "light"],
  [1440, "dark"],
]) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.goto(`${url}#inicio`)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.locator('[data-action="city"]:visible').first().click()
  await page.locator('[data-action="apply-city"]').first().click()
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    location.hash = "imoveis"
  })
  await page.waitForTimeout(600)
  for (const amen of ["pets", "furnished"]) {
    await page.locator(`#main [data-action="catalog-toggle"][data-value="${amen}"]`).click()
    await page.waitForTimeout(300)
    await page.locator('#main [data-action="search-alert"]').click()
    await page.waitForTimeout(400)
  }
  await page.waitForTimeout(800)
  await page.screenshot({ path: join(out, `pilha-${width}-${theme}.png`) })
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
