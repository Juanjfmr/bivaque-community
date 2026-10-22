import { mkdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createDeterministicContext, startCapture } from "./capture-support.mjs"

// Capturas dos balões de conversa (Rodada 20): node round20-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round20/telas")
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
  const id = await page.evaluate(() => {
    const k = "bivaque-material-web-v3"
    const x = JSON.parse(localStorage.getItem(k))
    const t = x.threads.find((t) => t.city === x.homeCity && !t.deleted && t.about.type === "item")
    const now = new Date()
    now.setHours(10, 0, 0, 0)
    const at = now.getTime()
    const y = at - 864e5
    t.msgs = [
      { me: true, t: "Oi, Paulo! O berço ainda está disponível?", at: y + 0 },
      { me: false, t: "Está sim! Desmontado e com o colchão.", at: y + 60e3 },
      { me: false, t: "Pode buscar sábado de manhã?", at: y + 90e3, react: "👍" },
      { me: true, t: "Posso sim. Passo às 9h.", at: at },
      { me: true, t: "Levo uma caixa para as peças pequenas.", at: at + 40e3 },
    ]
    localStorage.setItem(k, JSON.stringify(x))
    return t.id
  })
  await page.reload()
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.evaluate((v) => {
    location.hash = `conversa/${v}`
  }, id)
  await page.waitForTimeout(800)
  await page.screenshot({ path: join(out, `conversa-${width}-${theme}.png`) })
  await page.locator('.msg-react[aria-controls="react-pick-1"]').click()
  await page.waitForTimeout(250)
  await page.screenshot({ path: join(out, `reagir-${width}-${theme}.png`) })
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
