import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { chromium } from "playwright"

const root = process.cwd()
const out = join(root, ".visual/bivaque-html-round41/telas")

import { mkdirSync } from "node:fs"

mkdirSync(out, { recursive: true })
const url = pathToFileURL(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")).href
const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
})
const p = await ctx.newPage()
p.on("pageerror", (e) => console.log("ERRO", e.message))
await p.goto(url)
await p.waitForTimeout(800)
await p.evaluate(() => document.querySelector('[data-action="city"]')?.click())
await p.waitForTimeout(300)
await p.evaluate(() => document.querySelector('[data-action="apply-city"]')?.click())
await p.waitForTimeout(600)
const go = async (h) => {
  await p.evaluate((x) => {
    location.hash = x
  }, h)
  await p.waitForTimeout(900)
}
await go("imoveis")
await p.evaluate(() =>
  document.querySelector('#main [data-action="catalog-view"][data-value="map"]').click(),
)
await p.waitForTimeout(6000)
await p.evaluate(() => {
  const m = document.querySelector("main")
  m.style.scrollBehavior = "auto"
  m.scrollTop =
    document.querySelector("#catalog-map").getBoundingClientRect().top + m.scrollTop - 80
})
await p.waitForTimeout(600)
await p.evaluate(() => document.querySelector('.cmap-pin[data-value="Ponta Negra"]').click())
await p.waitForTimeout(800)
await p.screenshot({ path: join(out, "mapa-baixa.png") })
await p.evaluate(() => document.querySelector("#hood-panel .hp-grab").click())
await p.waitForTimeout(800)
await p.screenshot({ path: join(out, "mapa-metade.png") })
await p.evaluate(() => document.querySelector("#hood-panel .hp-grab").click())
await p.waitForTimeout(800)
await p.screenshot({ path: join(out, "mapa-cheia.png") })
await p.keyboard.press("Escape")
await p.waitForTimeout(400)
await go("conversas")
await p.evaluate(() => document.querySelector('#main [data-action="thread-menu"]').click())
await p.waitForTimeout(900)
await p.screenshot({ path: join(out, "folha-fundo.png") })
await b.close()
console.log("ok")
