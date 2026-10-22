import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createDeterministicContext, startCapture } from "./capture-support.mjs"

// Capturas de antes/depois da Rodada 10 para aprovação visual: node round10-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round10/depois")
const html = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const { server, url, browser } = await startCapture(html)
const scenes = {
  inicio: async (p) =>
    p.evaluate(() => {
      location.hash = "inicio"
    }),
  "catalogo-filtros": async (p) => {
    await p.evaluate(() => {
      location.hash = "catalogo"
    })
    await p.waitForTimeout(400)
    const toggle = p
      .locator('[data-action="toggle-filters"]:visible, [data-action="filters"]:visible')
      .first()
    if (await toggle.count()) await toggle.click()
    await p
      .locator("#catalog-min, #catalog-price")
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {})
  },
  busca: async (p) =>
    p.evaluate(() => {
      location.hash = "busca"
    }),
  conversa: async (p) =>
    p.evaluate(() => {
      location.hash = "conversa/t1"
    }),
  "negocio-editor": async (p) => {
    await p.evaluate(() => {
      location.hash = "voce"
    })
    await p.waitForTimeout(400)
    await p.locator('[data-action="my-biz"]:visible').first().click()
    await p.waitForTimeout(500)
    const entry = p.locator("#biz-hoods-entry input")
    if (await entry.count())
      for (const v of ["Centro", "Flores"]) {
        await entry.fill(v)
        await entry.press("Enter")
      }
    await p.locator("#biz-hoods, #biz-hoods-entry").first().scrollIntoViewIfNeeded()
  },
}
for (const theme of ["light", "dark"])
  for (const [name, go] of Object.entries(scenes)) {
    const context = await createDeterministicContext(browser, { width: 375, theme })
    const page = await context.newPage()
    await page.goto(url)
    await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
    await go(page)
    await page.waitForTimeout(700)
    await page.screenshot({ path: join(out, `${name}-375-${theme}.png`) })
    await context.close()
  }
await browser.close()
server.close()
console.log(`capturas em ${out}`)
