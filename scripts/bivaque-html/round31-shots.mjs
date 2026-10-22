import { mkdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createDeterministicContext, startCapture } from "./capture-support.mjs"

// Capturas do mapa de bairros com a rede de verdade (Rodada 31): node round31-shots.mjs <pasta>
// O MapLibre vem do unpkg e o mapa-base do OpenFreeMap, como no aparelho de quem usa.
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round31/telas")
mkdirSync(out, { recursive: true })
const html = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const { server, url, browser } = await startCapture(
  html,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? ["--use-gl=swiftshader", "--enable-webgl"] : [],
)
const hosts = new Set()
for (const [width, theme] of [
  [375, "light"],
  [1440, "light"],
]) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  page.on("request", (r) => {
    const u = new URL(r.url())
    if (u.protocol.startsWith("http") && u.hostname !== "127.0.0.1") hosts.add(u.hostname)
  })
  await page.goto(`${url}#inicio`)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.locator('[data-action="city"]:visible').first().click()
  await page.locator('[data-action="apply-city"]').first().click()
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    location.hash = "imoveis"
  })
  await page.waitForTimeout(600)
  await page.locator('#main [data-action="catalog-view"][data-value="map"]').click()
  await page.waitForTimeout(9000)
  await page.screenshot({ path: join(out, `mapa-${width}-${theme}.png`) })
  const pin = page.locator("#catalog-map .cmap-pin").first()
  if (await pin.count()) {
    // O marcador se reposiciona enquanto o mapa assenta; o clique vai direto ao elemento.
    await pin.dispatchEvent("click")
    await page.waitForTimeout(700)
    await page.screenshot({ path: join(out, `bairro-${width}-${theme}.png`) })
  }
  console.log(
    width,
    await page
      .locator("#cmap-status")
      .textContent()
      .catch(() => "(mapa carregado)"),
  )
  await context.close()
}
await browser.close()
server.close()
console.log("hosts externos:", [...hosts].join(", "))
console.log(`OK: ${out}`)
