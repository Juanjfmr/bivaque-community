import { mkdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createDeterministicContext, startCapture } from "./capture-support.mjs"

// Capturas de estados vazios e fotos carregando (Rodada 24): node round24-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round24/telas")
mkdirSync(out, { recursive: true })
const html = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const { server, url, browser } = await startCapture(html)
for (const [width, theme] of [
  [375, "light"],
  [375, "dark"],
  [1440, "light"],
]) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  await page.goto(`${url}#inicio`)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.locator('[data-action="city"]:visible').first().click()
  await page.locator('[data-action="apply-city"]').first().click()
  await page.waitForTimeout(400)
  const tag = `${width}-${theme}`
  await page.evaluate(() => {
    location.hash = "desapegos"
  })
  await page.waitForTimeout(600)
  await page.locator('#main [data-action="catalog-pill"][data-value="cat"]').click()
  await page.waitForTimeout(300)
  await page.locator('#filter-panel [data-field="cats"][data-v="Eletrônicos"]').click()
  await page.locator('#filter-panel [data-f="apply"]').click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(out, `vazio-filtro-${tag}.png`) })
  await page.evaluate(() => {
    const k = "bivaque-material-web-v3"
    const x = JSON.parse(localStorage.getItem(k))
    x.threads = []
    localStorage.setItem(k, JSON.stringify(x))
  })
  await page.reload()
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.evaluate(() => {
    location.hash = "conversas"
  })
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(out, `vazio-conversas-${tag}.png`) })
  await page.evaluate(() => {
    location.hash = "imoveis"
  })
  await page.waitForTimeout(700)
  await page.evaluate(() => {
    for (const img of [...document.querySelectorAll("#catalog-results .cover img")].slice(0, 2)) {
      img.closest(".cover").classList.remove("img-ready")
      img.classList.remove("img-in")
      img.removeAttribute("loading")
      img.src = `/slow-${Math.random()}.png`
    }
  })
  await page.waitForTimeout(500)
  await page.screenshot({ path: join(out, `foto-carregando-${tag}.png`) })
  await context.close()
}
await browser.close()
server.closeAllConnections()
server.close()
console.log(`OK: ${out}`)
