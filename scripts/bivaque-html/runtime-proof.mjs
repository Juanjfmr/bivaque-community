import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"

const root = resolve(import.meta.dirname, "../..")
const out = join(root, ".visual/bivaque-html-round00")
const original = join(root, "prototypes/bivaque-html/reference/Bivaque_Material_Web.original.html")
const generated = join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")
const baselineOnly = process.argv.includes("--baseline-only")
const browserPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex")
mkdirSync(join(out, "shots"), { recursive: true })
assert(existsSync(original), "Original ausente")
if (!baselineOnly) assert(existsSync(generated), "Execute build.py antes da prova comparativa")
const server = createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname
  const file = path === "/original.html" ? original : path === "/generated.html" ? generated : null
  if (!file || !existsSync(file)) {
    res.writeHead(404).end()
    return
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
  res.end(readFileSync(file))
})
await new Promise((done) => server.listen(0, "127.0.0.1", done))
const url = `http://127.0.0.1:${server.address().port}`
const report = {
  baselineOnly,
  captures: [],
  journeys: [],
  errors: [],
  fileHash: sha(readFileSync(original)),
}
let browser

async function action(page, name, value) {
  const selector = `[data-action="${name}"]${value ? `[data-value="${value}"]` : ""}`
  const control = page.locator(`${selector}:visible`).first()
  await control.click()
}

async function ready(page) {
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await page.evaluate(async () => {
    await document.fonts.ready
    const visibleImages = Array.from(document.images).filter((img) => {
      const rect = img.getBoundingClientRect()
      return rect.width > 0 && rect.top < innerHeight && rect.bottom > 0
    })
    await Promise.all(visibleImages.map((img) => img.decode().catch(() => {})))
  })
}

async function snapshot(page, stage, scene, width, theme) {
  await ready(page)
  const file = `${stage}-${scene}-${width}-${theme}.png`
  const bytes = await page.screenshot({ path: join(out, "shots", file), animations: "disabled" })
  const data = await page.evaluate(() => ({
    route: window.Bivaque.inspect().route,
    theme: document.documentElement.dataset.theme,
    heading: document.querySelector("#main h1")?.textContent ?? null,
    dialog: document.querySelector("#dialog")?.open ?? false,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }))
  const capture = { stage, scene, width, theme, file, sha256: sha(bytes), ...data }
  report.captures.push(capture)
  return capture
}

async function inspectCandidate(stage, width, theme) {
  const context = await browser.newContext({
    viewport: { width, height: width === 375 ? 812 : width === 768 ? 1024 : 900 },
    colorScheme: theme,
    reducedMotion: "reduce",
    timezoneId: "America/Manaus",
    locale: "pt-BR",
  })
  await context.addInitScript(() => {
    let sequence = 0
    Object.defineProperty(crypto, "randomUUID", {
      value: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
    })
  })
  const page = await context.newPage()
  await page.clock.setFixedTime("2026-10-13T16:00:00Z")
  page.setDefaultTimeout(5000)
  page.setDefaultNavigationTimeout(10000)
  page.on("pageerror", (error) =>
    report.errors.push({ stage, width, theme, message: error.message }),
  )
  page.on("console", (message) => {
    if (message.type() === "error")
      report.errors.push({ stage, width, theme, message: message.text() })
  })
  const checks = []
  const visit = async (hash) => {
    await page.goto("about:blank")
    await page.goto(`${url}/${stage === "baseline" ? "original" : "generated"}.html#${hash}`)
    await ready(page)
    assert.equal(await page.evaluate(() => window.Bivaque.inspect().route.name), hash.split("/")[0])
  }
  try {
    await visit("inicio")
    checks.push("home-material-components")
    await snapshot(page, stage, "home", width, theme)
    await action(page, "create")
    await page.locator("#create-menu").waitFor({ state: "visible" })
    checks.push("create-menu")
    await snapshot(page, stage, "create", width, theme)

    await visit("inicio")
    await action(page, "search")
    await page.locator("#search-query input").fill("sofa")
    await page.waitForFunction(() =>
      document.querySelector("#search-results")?.textContent.includes("Sof"),
    )
    assert((await page.locator('[data-action="open-item"]').count()) > 0)
    checks.push("search-results")
    await snapshot(page, stage, "search", width, theme)
    console.log(`${stage} ${width} ${theme}: busca capturada`)
    await page.locator("#search-query input").fill("zzzz-sem-resultado-000")
    await page.waitForFunction(
      () => document.querySelector("#search-results")?.textContent.includes("Nada sobre"),
      undefined,
      { timeout: 5000 },
    )
    checks.push("search-empty")

    await visit("catalogo")
    await action(page, "open-item")
    assert.equal(await page.evaluate(() => window.Bivaque.inspect().route.name), "anuncio")
    checks.push("listing-detail")
    await snapshot(page, stage, "listing", width, theme)

    await visit("negocios")
    await action(page, "open-biz")
    assert.equal(await page.evaluate(() => window.Bivaque.inspect().route.name), "negocio")
    checks.push("business-detail")
    await snapshot(page, stage, "business", width, theme)

    await visit("comunidade")
    await action(page, "community-tab", "grp")
    await page.locator('[data-action="open-group"]').filter({ visible: true }).first().waitFor()
    await snapshot(page, stage, "groups", width, theme)
    await action(page, "open-group")
    assert.equal(await page.evaluate(() => window.Bivaque.inspect().route.name), "grupo")
    checks.push("group-detail")

    await visit("conversas")
    const thread = await page
      .locator('[data-action="open-thread"]')
      .first()
      .getAttribute("data-value")
    await action(page, "open-thread")
    if ((await page.evaluate(() => window.Bivaque.inspect().route.name)) !== "conversa") {
      report.errors.push({
        stage,
        width,
        theme,
        message: "open-thread nao abre conversa (acao visivel sem resposta)",
      })
      await visit(`conversa/${thread}`)
      checks.push("thread-renderer-via-direct-route-only")
    } else {
      checks.push("thread-detail")
    }
    await snapshot(page, stage, "conversation", width, theme)

    await visit("voce")
    await action(page, "prototype")
    await action(page, "onboarding")
    await action(page, "onboard-next")
    await page.locator("#onboard-name").waitFor({ state: "visible" })
    checks.push("onboarding-entry")
    await snapshot(page, stage, "onboarding", width, theme)
    const knownFailures = report.errors.filter(
      (item) => item.stage === stage && item.width === width && item.theme === theme,
    )
    report.journeys.push({
      stage,
      width,
      theme,
      checks,
      status: knownFailures.length ? "FAIL" : "PASS",
    })
  } catch (error) {
    report.journeys.push({ stage, width, theme, checks, status: "FAIL", error: error.message })
    await page
      .screenshot({ path: join(out, "shots", `${stage}-failure-${width}-${theme}.png`) })
      .catch(() => {})
  } finally {
    await context.close()
  }
}

try {
  browser = await chromium.launch(browserPath ? { executablePath: browserPath } : {})
  for (const width of [375, 768, 1440]) {
    for (const theme of ["light", "dark"]) {
      await inspectCandidate("baseline", width, theme)
      if (!baselineOnly) await inspectCandidate("generated", width, theme)
      console.log(`Capturado ${width} ${theme}`)
    }
  }
  if (!baselineOnly) {
    report.generatedHash = sha(readFileSync(generated))
    report.identicalBytes = report.generatedHash === report.fileHash
    report.comparisons = report.captures
      .filter((capture) => capture.stage === "generated")
      .map((capture) => {
        const baseline = report.captures.find(
          (item) =>
            item.stage === "baseline" &&
            item.width === capture.width &&
            item.theme === capture.theme &&
            item.scene === capture.scene,
        )
        return {
          scene: capture.scene,
          width: capture.width,
          theme: capture.theme,
          identicalPixels: baseline?.sha256 === capture.sha256,
        }
      })
  }
  const failed =
    report.journeys.some((journey) => journey.status !== "PASS") ||
    report.errors.length > 0 ||
    (!baselineOnly &&
      (!report.identicalBytes || report.comparisons.some((item) => !item.identicalPixels)))
  report.status = failed ? "FAIL" : "PASS"
  process.exitCode = failed ? 1 : 0
} catch (error) {
  report.status = "BLOCKED"
  report.errors.push({ message: error.message })
  process.exitCode = 1
} finally {
  await browser?.close()
  await new Promise((done) => server.close(done))
  const path = join(out, baselineOnly ? "baseline-runtime.json" : "runtime-report.json")
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`)
  console.log(`${report.status}: ${path}`)
}
