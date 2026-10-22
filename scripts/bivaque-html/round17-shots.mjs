import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createDeterministicContext, startCapture } from "./capture-support.mjs"

// Capturas da central de avisos (Rodada 17): node round17-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round17/telas")
const html = readFileSync(join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"))
const { server, url, browser } = await startCapture(html)
for (const [width, theme] of [
  [1440, "light"],
  [375, "dark"],
]) {
  const context = await createDeterministicContext(browser, { width, theme })
  const page = await context.newPage()
  await page.goto(`${url}#inicio`)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.locator('[data-action="city"]:visible').first().click()
  await page.locator('[data-action="apply-city"]').first().click()
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    const k = "bivaque-material-web-v3"
    const x = JSON.parse(localStorage.getItem(k))
    const city = x.homeCity
    x.notices = [
      {
        id: "n1",
        city,
        unread: true,
        text: "2 novas propostas para seu pedido de Elétrica",
        go: ["pedido", "r1"],
        when: "Agora",
      },
      {
        id: "n2",
        city,
        unread: true,
        text: "Marcos T. respondeu sua mensagem",
        go: ["conversa", "t1"],
        when: "Hoje",
      },
      {
        id: "n3",
        city,
        unread: false,
        text: "Novo desapego perto de você: Berço com colchão",
        go: ["anuncio", "i3"],
        when: "Segunda",
      },
      {
        id: "n4",
        city,
        unread: false,
        text: "Encontro confirmado: Treino de 8 km no calçadão",
        go: ["agenda"],
        when: "Domingo",
      },
    ]
    localStorage.setItem(k, JSON.stringify(x))
  })
  await page.reload()
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.locator('[data-action="notices"]:visible').first().click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: join(out, `avisos-${width}-${theme}.png`) })
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
