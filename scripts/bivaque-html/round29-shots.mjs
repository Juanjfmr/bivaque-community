import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createDeterministicContext, startCapture } from "./capture-support.mjs"

// Capturas do cartão de compartilhamento (Rodada 29): node round29-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round29/telas")
mkdirSync(out, { recursive: true })
const html = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const { server, url, browser } = await startCapture(html)
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
  for (const hash of ["anuncio/i2", "negocio/b4", "anuncio/i11"]) {
    await page.evaluate((h) => {
      location.hash = h
    }, hash)
    await page.waitForTimeout(600)
    await page.locator('#detail-actions [data-action="share"]').click()
    await page.waitForFunction(() => document.querySelector("#share-preview img")?.complete)
    await page.waitForTimeout(300)
    const name = hash.replace("/", "-")
    if (width === 375) await page.screenshot({ path: join(out, `folha-${name}-${width}.png`) })
    // A própria imagem do cartão, como chega no WhatsApp.
    if (width === 375) {
      const png = await page.evaluate(async () => {
        const blob = await (await fetch(document.querySelector("#share-preview img").src)).blob()
        return new Uint8Array(await blob.arrayBuffer())
      })
      writeFileSync(join(out, `cartao-${name}.png`), Buffer.from(Object.values(png)))
    } else await page.screenshot({ path: join(out, `folha-${name}-${width}.png`) })
    await page.keyboard.press("Escape")
    await page.waitForTimeout(300)
  }
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
