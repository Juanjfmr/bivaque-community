import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createDeterministicContext, startCapture } from "./capture-support.mjs"

// Capturas de fotos e galeria (Rodada 18): node round18-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round18/telas")
const html = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const { server, url, browser } = await startCapture(html)
for (const [width, theme] of [
  [1440, "light"],
  [375, "light"],
]) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  await page.goto(`${url}#inicio`)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.locator('[data-action="city"]:visible').first().click()
  await page.locator('[data-action="apply-city"]').first().click()
  await page.waitForTimeout(400)
  const id = await page.evaluate(() => {
    const k = "bivaque-material-web-v3"
    const x = JSON.parse(localStorage.getItem(k))
    const item = x.items.find((i) => i.city === x.homeCity && i.status === "active" && !i.mine)
    item.photos = ["sofa", "interior", "apartment"]
    localStorage.setItem(k, JSON.stringify(x))
    return item.id
  })
  await page.reload()
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.evaluate((v) => {
    location.hash = `anuncio/${v}`
  }, id)
  await page.waitForTimeout(800)
  await page.screenshot({ path: join(out, `anuncio-${width}.png`) })
  await page.locator('#main [data-action="lightbox"]').click()
  await page.waitForTimeout(400)
  await page.keyboard.press("ArrowRight")
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(out, `galeria-${width}.png`) })
  await page.keyboard.press("Escape")
  await page.evaluate(() => {
    location.hash = "inicio"
  })
  await page.waitForTimeout(500)
  await page.locator('[data-action="create"]:visible').first().click()
  await page.waitForTimeout(400)
  await page.locator('#create-menu [data-action="create-item"]').click()
  await page.waitForTimeout(600)
  await page.evaluate(async () => {
    const make = (hue) => {
      const c = document.createElement("canvas")
      c.width = 320
      c.height = 240
      const g = c.getContext("2d")
      g.fillStyle = `hsl(${hue},55%,55%)`
      g.fillRect(0, 0, 320, 240)
      return new Promise((r) =>
        c.toBlob((b) => r(new File([b], `f${hue}.png`, { type: "image/png" }))),
      )
    }
    const dt = new DataTransfer()
    for (const h of [190, 30, 140]) dt.items.add(await make(h))
    const box = document.querySelector(".photo-upload")
    box.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }))
  })
  await page.waitForTimeout(900)
  await page.evaluate(() => {
    const box = document.querySelector(".photo-upload")
    box.scrollIntoView({ block: "center" })
  })
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, `editor-fotos-${width}.png`) })
  await page.evaluate(() => document.querySelector(".photo-upload").classList.add("is-drag"))
  await page.waitForTimeout(200)
  await page.screenshot({ path: join(out, `editor-soltar-${width}.png`) })
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
