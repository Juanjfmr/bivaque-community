// Sonda de estilo computado da aba ativa (RECON-045).
// A revisao independente mostrou que a afirmacao "borda de 2px e peso 600"
// nao tinha artefato salvo: este script produz um. Nao substitui o teste de
// unidade da regra unica; mede o estilo que o navegador realmente aplica.
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { chromium } from "playwright"
import { fetchSession } from "./capture.mjs"

const BASE_URL = process.env.BIVAQUE_VISUAL_BASE_URL ?? "http://127.0.0.1:3000"
// O artefato mora em .visual/ (gitignored, ao lado dos runs de captura), e nao
// ao lado do script: a sonda foi promovida de .visual/ para scripts/visual/ e a
// primeira versao passou a escrever em scripts/visual/recon-loteAC-tabs — a
// localizacao declarada no card nao era a que o script produzia (achado da
// re-revisao independente do RECON-045).
const OUT = join(import.meta.dirname, "..", "..", ".visual", "recon-loteAC-tabs")
const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
]
const ROUTES = ["/salvos", "/events"]

// O ator importa: as abas de participacao de /events so renderizam quando a
// pessoa tem evento proprio (`hasOwnEvents`, events/page.tsx:912). Com o ator
// sem eventos o grupo nao existe no DOM e a medicao vira "nao-verificavel".
const ACCOUNT = process.env.BIVAQUE_VISUAL_PROBE_ACCOUNT ?? "visual"
const auth = await fetchSession(ACCOUNT)
const browser = await chromium.launch()
const rows = []

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  })
  const sessionValue = `base64-${Buffer.from(JSON.stringify(auth.session)).toString("base64url")}`
  await context.addCookies([
    { name: "bivaque-consent-version", value: "2", url: BASE_URL },
    { name: auth.storageKey, value: sessionValue, url: BASE_URL },
  ])
  await context.addInitScript(
    ([key, session]) => window.localStorage.setItem(key, JSON.stringify(session)),
    [auth.storageKey, auth.session],
  )
  const page = await context.newPage()
  for (const route of ROUTES) {
    await page.goto(BASE_URL + route, { waitUntil: "networkidle", timeout: 30_000 })
    await page.waitForTimeout(400)
    const measured = await page.evaluate(() => {
      // A regra do RECON-045 e a da variante secundaria. /events tem mais de um
      // grupo de abas (o filtro de participacao usa tabs--secondary, e ha um
      // grupo acima): medir o primeiro [role=tab] ativo do documento mede o
      // grupo errado. O escopo e o container da propria variante.
      const containers = [...document.querySelectorAll(".tabs--secondary")]
      const active =
        containers
          .map((box) => box.querySelector('[role="tab"][data-selected="true"]'))
          .find((tab) => tab !== null) ?? null
      const style = active ? getComputedStyle(active) : null
      const root = getComputedStyle(document.documentElement)
      const anyActive = document.querySelector('[role="tab"][data-selected="true"]')
      return {
        secondaryContainers: containers.length,
        tabCount: containers.reduce(
          (total, box) => total + box.querySelectorAll('[role="tab"]').length,
          0,
        ),
        activeLabel: active ? (active.textContent ?? "").trim().slice(0, 30) : null,
        // O contrato do RECON-045 tambem exige que o anuncio da aba selecionada
        // para leitor de tela continue correto. O probe media so o marcador
        // visual (data-selected); a ressalva da revisao independente foi que
        // aria-selected nao tinha medicao propria.
        ariaSelected: active ? active.getAttribute("aria-selected") : null,
        firstActiveLabel: anyActive ? (anyActive.textContent ?? "").trim().slice(0, 30) : null,
        borderBottomWidth: style ? style.borderBottomWidth : null,
        borderBottomColor: style ? style.borderBottomColor : null,
        fontWeight: style ? style.fontWeight : null,
        labelWeightToken: root.getPropertyValue("--semantic-typography-label-weight").trim(),
        horizontalOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth,
      }
    })
    rows.push({ route, viewport: viewport.name, ...measured })
  }
  await context.close()
}
await browser.close()

mkdirSync(OUT, { recursive: true })
const report = { baseURL: BASE_URL, capturedAt: new Date().toISOString(), rows }
writeFileSync(
  join(OUT, `probe-${ACCOUNT}.json`),
  JSON.stringify({ account: ACCOUNT, ...report }, null, 2),
  "utf8",
)
console.log("ator: " + ACCOUNT)
for (const row of rows) {
  console.log(
    row.viewport.padEnd(12) +
      row.route.padEnd(18) +
      " aba='" +
      row.activeLabel +
      "' borda=" +
      row.borderBottomWidth +
      " peso=" +
      row.fontWeight +
      " (token=" +
      row.labelWeightToken +
      ") overflow=" +
      row.horizontalOverflow,
  )
}
