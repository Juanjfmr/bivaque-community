import { mkdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createDeterministicContext, startCapture } from "./capture-support.mjs"

// Capturas de Desapegos e Imóveis com filtros próprios (Rodada 22): node round22-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round22/telas")
mkdirSync(out, { recursive: true })
const html = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const { server, url, browser } = await startCapture(html)
const errors = []
for (const [width, theme] of [
  [1440, "light"],
  [375, "light"],
  [1440, "dark"],
]) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  page.on("pageerror", (e) => errors.push(`${width}: ${e.message}`))
  await page.goto(`${url}#inicio`)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.locator('[data-action="city"]:visible').first().click()
  await page.locator('[data-action="apply-city"]').first().click()
  await page.waitForTimeout(500)
  for (const hash of ["imoveis", "desapegos"]) {
    await page.evaluate((h) => {
      location.hash = h
    }, hash)
    await page.waitForTimeout(800)
    if (width < 1024) {
      await page.locator('[data-action="catalog-more"]').click()
      await page.waitForTimeout(300)
    }
    await page.screenshot({
      path: join(out, `${hash}-${width}-${theme}.png`),
      fullPage: width < 1024,
    })
  }
  if (theme === "light") {
    await page.evaluate(() => {
      location.hash = "imoveis"
    })
    await page.waitForTimeout(500)
    await page.locator('[data-action="create-property"]:visible').first().click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: join(out, `editor-imovel-${width}.png`) })
  }
  await context.close()
}
await browser.close()
server.close()
console.log(errors.length ? `ERROS:\n${errors.join("\n")}` : `OK: ${out}`)
