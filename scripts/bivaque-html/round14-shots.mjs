import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createDeterministicContext, startCapture } from "./capture-support.mjs"

// Capturas da paleta Ctrl+K (Rodada 14) para aprovação visual: node round14-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round14/telas")
const html = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const { server, url, browser } = await startCapture(html)
for (const theme of ["light", "dark"]) {
  const context = await createDeterministicContext(browser, { width: 1440, theme })
  const page = await context.newPage()
  await page.goto(`${url}#inicio`)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.waitForTimeout(800)
  await page.screenshot({
    path: join(out, `inicio-${theme}.png`),
    clip: { x: 96, y: 60, width: 1000, height: 260 },
  })
  await page.locator("#main h1").first().click()
  await page.keyboard.press("Control+k")
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(out, `paleta-vazia-${theme}.png`) })
  await page.keyboard.type("mudan")
  await page.keyboard.press("ArrowDown")
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(out, `paleta-busca-${theme}.png`) })
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
