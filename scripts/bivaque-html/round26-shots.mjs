import { mkdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createDeterministicContext, startCapture } from "./capture-support.mjs"

// Capturas do plano com anel e "Continuar" (Rodada 26): node round26-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round26/telas")
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
    const k = "bivaque-material-web-v3"
    const x = JSON.parse(localStorage.getItem(k))
    x.mode = "chegando"
    x.plan.chegando.forEach((s, i) => {
      s.done = i < 2
    })
    localStorage.setItem(k, JSON.stringify(x))
  })
  await page.reload()
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.waitForTimeout(600)
  await page.locator("#main .plan-card").scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, `plano-${width}-${theme}.png`) })
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
