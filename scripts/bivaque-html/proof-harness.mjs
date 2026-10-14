import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "./capture-support.mjs"

// Harness comum das provas por rodada. Uso: `runProof(checkpoints, "round03")`.
// Sem `--full` roda só 375 claro; BIVAQUE_HTML_CHECKPOINT=<nome> roda um checkpoint.
export const KEY = "bivaque-material-web-v3"
export const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY)
export const toast = (page) => page.locator("#snackbar").innerText()
export const settle = (page) => page.waitForTimeout(350)
export const dialogKind = (page) =>
  page.evaluate(() => {
    const d = document.querySelector("#dialog")
    return d?.open ? d.dataset.kind || "dialog" : null
  })
export const routeOf = (page) => page.evaluate(() => window.Bivaque.inspect().route)
export function expect(condition, message) {
  if (!condition) throw new Error(message)
}
export async function go(page, hash) {
  await page.evaluate((h) => {
    location.hash = h
  }, hash)
  await settle(page)
}
export async function action(page, name, value) {
  const scope = value ? `[data-action="${name}"][data-value="${value}"]` : `[data-action="${name}"]`
  const visible = page.locator(`${scope}:visible`)
  if (!value && (await visible.count()) === 0) await go(page, "voce")
  await page.locator(`${scope}:visible`).first().click()
  await settle(page)
}
export async function choose(page, id, value) {
  await page.locator(`#${id}`).click()
  const option = value
    ? page.locator(`#${id} md-select-option[value="${value}"]`)
    : page.locator(`#${id} md-select-option`).nth(1)
  await option.click()
  await settle(page)
}
export async function fill(page, id, text) {
  await page.locator(`#${id} input, #${id} textarea`).first().fill(String(text))
}
export async function confirmOk(page) {
  await page.locator("#confirm-dialog md-filled-button").last().click()
  await settle(page)
}
export async function failStorage(page) {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError")
    }
  })
}
export async function reload(page) {
  await page.reload()
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
}

export async function runProof(checkpoints, round) {
  const root = resolve(import.meta.dirname, "../..")
  const output = resolve(
    root,
    process.env.BIVAQUE_HTML_PROOF_OUT ?? `.visual/bivaque-html-${round}/functional`,
  )
  const candidate = readFileSync(
    join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"),
  )
  const contexts = process.argv.includes("--full")
    ? ["375-light", "375-dark", "768-light", "768-dark", "1440-light", "1440-dark"]
    : (process.env.BIVAQUE_HTML_CONTEXTS ?? "375-light").split(",")
  const only = process.env.BIVAQUE_HTML_CHECKPOINT
  mkdirSync(join(output, "shots"), { recursive: true })
  const report = {
    round,
    candidateHash: createHash("sha256").update(candidate).digest("hex"),
    contexts,
    cases: [],
    browserErrors: [],
    externalRequests: [],
  }
  const server = createServer((req, res) => {
    const path = new URL(req.url, "http://localhost").pathname
    if (path === "/favicon.ico") return res.writeHead(204).end()
    if (path !== "/candidate.html") return res.writeHead(404).end()
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(candidate)
  })
  await new Promise((done) => server.listen(0, "127.0.0.1", done))
  const url = `http://127.0.0.1:${server.address().port}/candidate.html`
  const browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  )
  try {
    for (const ctx of contexts) {
      const [width, theme] = ctx.split("-")
      for (const [name, run] of Object.entries(checkpoints)) {
        if (only && only !== name) continue
        const context = await createDeterministicContext(browser, { width: Number(width), theme })
        // Links externos (WhatsApp, Instagram, mapa) são registrados, não abertos.
        await context.addInitScript(() => {
          window.__opened = []
          window.open = (u) => {
            window.__opened.push(String(u))
            return null
          }
        })
        const page = await context.newPage()
        page.on("pageerror", (e) => report.browserErrors.push({ ctx, name, message: e.message }))
        page.on("request", (r) => {
          if (!r.url().startsWith("http://127.0.0.1") && !r.url().startsWith("data:"))
            report.externalRequests.push({ ctx, name, url: r.url() })
        })
        const result = { ctx, name, status: "PASS" }
        try {
          await page.goto(url)
          await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
          await run(page)
        } catch (error) {
          result.status = "FAIL"
          result.error = error.message.split("\n")[0]
          await page
            .screenshot({ path: join(output, "shots", `${ctx}-${name}.png`) })
            .catch(() => {})
        }
        report.cases.push(result)
        console.log(`${result.status} ${ctx} ${name}${result.error ? ` — ${result.error}` : ""}`)
        await context.close()
      }
    }
  } finally {
    await browser.close()
    server.close()
    const failed = report.cases.filter((c) => c.status !== "PASS").length
    report.status =
      failed || report.browserErrors.length || report.externalRequests.length ? "FAIL" : "PASS"
    writeFileSync(join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`)
    console.log(
      `${report.status}: ${report.cases.length - failed}/${report.cases.length} checkpoints; JS errors ${report.browserErrors.length}; external ${report.externalRequests.length}`,
    )
    process.exitCode = report.status === "PASS" ? 0 : 1
  }
}
