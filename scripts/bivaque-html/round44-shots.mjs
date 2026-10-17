import { mkdirSync } from "node:fs"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { chromium } from "playwright"

const root = process.cwd()
const out = join(root, ".visual/bivaque-html-round44/telas")
mkdirSync(out, { recursive: true })
// Rodada 44: busca vazia e digitando (não é prova).
const url = pathToFileURL(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")).href
const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
const p = await (
  await b.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  })
).newPage()
await p.goto(url)
await p.waitForTimeout(800)
await p.evaluate(() => document.querySelector('[data-action="city"]')?.click())
await p.waitForTimeout(300)
await p.evaluate(() => document.querySelector('[data-action="apply-city"]')?.click())
await p.waitForTimeout(600)
await p.evaluate(() => {
  const k = "bivaque-material-web-v3"
  const x = JSON.parse(localStorage.getItem(k))
  x.recent = ["pediatra pelo plano", "berço"]
  localStorage.setItem(k, JSON.stringify(x))
})
await p.reload()
await p.waitForTimeout(900)
await p.evaluate(() => document.querySelector("#home-search").click())
await p.waitForTimeout(900)
await p.screenshot({ path: join(out, "busca-vazia.png") })
await p.keyboard.type("diar", { delay: 60 })
await p.waitForTimeout(900)
await p.screenshot({ path: join(out, "busca-digitando.png") })
await b.close()
