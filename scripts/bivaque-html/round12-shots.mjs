import { readFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "./capture-support.mjs"

// Capturas da Rodada 12 para aprovação visual: node round12-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round12/telas")
const html = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const server = createServer((_, res) =>
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(html),
)
await new Promise((done) => server.listen(0, "127.0.0.1", done))
const url = `http://127.0.0.1:${server.address().port}/`
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
)
const hash = (p, h) =>
  p.evaluate((x) => {
    location.hash = x
  }, h)
const pick = async (p, id, value) => {
  await p.locator(`#${id}`).click()
  await p.locator(`#${id} md-select-option[value="${value}"]`).click()
  await p.waitForTimeout(400)
}
const scenes = {
  "pedido-formulario": async (p) => {
    await p.locator('[data-action="create"]:visible').first().click()
    await p.waitForTimeout(400)
    await p.locator('#create-menu [data-action="create-request"]').click()
    await p.waitForTimeout(500)
    await pick(p, "request-cat", "Casa e reparos")
    await p.locator("#request-spec").click()
    await p.waitForTimeout(400)
  },
  "negocio-editor": async (p) => {
    await hash(p, "voce")
    await p.waitForTimeout(400)
    await p.locator('[data-action="my-biz"]:visible').first().click()
    await p.waitForTimeout(500)
    await pick(p, "biz-category", "Veículos")
    await p.locator('#biz-specs md-filter-chip[data-spec="Lavagem"]').click()
    await p.locator("#biz-specs").scrollIntoViewIfNeeded()
  },
  negocios: async (p) => hash(p, "negocios"),
  "negocio-detalhe": async (p) => {
    await hash(p, "negocios")
    await p.waitForTimeout(400)
    await p.locator('#main [data-action="open-biz"]').filter({ hasText: "Jorge" }).first().click()
  },
}
for (const [name, run] of Object.entries(scenes))
  for (const width of [375, 1440]) {
    const context = await createDeterministicContext(browser, { width, theme: "light" })
    const page = await context.newPage()
    await page.goto(`${url}#inicio`)
    await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
    await run(page)
    await page.waitForTimeout(700)
    await page.screenshot({ path: join(out, `${name}-${width}.png`) })
    await context.close()
  }
await browser.close()
server.close()
console.log(`OK: ${out}`)
