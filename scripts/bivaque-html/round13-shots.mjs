import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createDeterministicContext, startCapture } from "./capture-support.mjs"

// Capturas da Início do desktop (Rodada 13) para aprovação visual: node round13-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round13/telas")
const html = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const { server, url, browser } = await startCapture(html)
for (const [width, theme, full] of [
  [1440, "light", true],
  [1440, "dark", false],
  [1024, "light", false],
  [375, "light", false],
]) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  await page.goto(`${url}#inicio`)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.waitForTimeout(900)
  await page.screenshot({ path: join(out, `inicio-${width}-${theme}.png`), fullPage: full })
  if (full) {
    await page.locator("#fab").click()
    await page.waitForTimeout(900)
    await page.screenshot({ path: join(out, `criar-${width}-${theme}.png`) })
  }
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
