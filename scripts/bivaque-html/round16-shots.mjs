import { readFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "./capture-support.mjs"

// Capturas da comparação de propostas (Rodada 16): node round16-shots.mjs <pasta>
const root = resolve(import.meta.dirname, "../..")
const out = resolve(root, process.argv[2] ?? ".visual/bivaque-html-round16/telas")
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
for (const [width, theme] of [
  [1440, "light"],
  [1440, "dark"],
  [375, "light"],
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
    const biz = x.biz.filter((b) => b.city === x.homeCity && b.claimed !== false)
    const at = Date.now()
    const p = (id, b, price, date, duration, msg, n) => ({
      id,
      bizId: b.id,
      price,
      date,
      validUntil: "2026-10-24",
      duration,
      msg,
      status: "sent",
      at: at + n,
    })
    x.requests = [
      {
        id: "r-cmp",
        city: x.homeCity,
        cat: "Casa e reparos",
        spec: "Elétrica",
        hood: "Centro",
        desc: "Trocar o quadro de luz e instalar três tomadas na cozinha.",
        when: { kind: "asap", date: null },
        photos: [],
        status: "open",
        createdAt: at,
        expiresAt: at + 6 * 864e5,
        who: "Eu",
        mine: true,
        proposals: [
          p(
            "p1",
            biz[0],
            { kind: "fixed", min: 420 },
            "2026-10-20",
            "1 dia",
            "Inclui material básico e garantia de 90 dias no serviço.",
            1,
          ),
          p(
            "p2",
            biz[1],
            { kind: "range", min: 280, max: 380 },
            "2026-10-18",
            "Meio período",
            "Atendo o Centro. Valor final depende do quadro existente.",
            2,
          ),
          p(
            "p3",
            biz[2],
            { kind: "visit" },
            "2026-10-16",
            "2 a 3 dias",
            "Preciso ver o local antes de fechar o valor.",
            3,
          ),
        ],
      },
    ]
    localStorage.setItem(k, JSON.stringify(x))
  })
  await page.reload()
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.evaluate(() => {
    location.hash = "pedido/r-cmp"
  })
  await page.waitForTimeout(900)
  await page.locator(".prop-sort, .prop-compare").first().scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(out, `propostas-${width}-${theme}.png`) })
  await context.close()
}
await browser.close()
server.close()
console.log(`OK: ${out}`)
