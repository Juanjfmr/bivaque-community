#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { sessionCookies } from "./sessao.mjs"

const label = process.argv[2]
if (!label) throw new Error("uso: node scripts/exp-front/celular.mjs <rótulo>")
const root = resolve(import.meta.dirname, "../..")
const output = join(root, ".visual/exp-front", label)
mkdirSync(output, { recursive: true })
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
)
const context = await browser.newContext({ viewport: { width: 375, height: 812 } })
await context.addCookies(await sessionCookies())
const page = await context.newPage()
const cdp = await context.newCDPSession(page)
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 })
await cdp.send("Network.enable")
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 150,
  downloadThroughput: 200_000,
  uploadThroughput: 93_750,
  connectionType: "cellular3g",
})
const resources = []
cdp.on("Network.loadingFinished", ({ encodedDataLength }) => resources.push(encodedDataLength))
const report = {
  emulation: {
    viewport: "375x812",
    cpuSlowdown: 4,
    network: "4G lenta (150ms, 1.6Mbps down, 750Kbps up)",
  },
  cold: {},
  warm: {},
  interactions: {},
  scroll: {},
  memory: null,
  transferredBytes: 0,
}

try {
  for (const cache of ["cold", "warm"]) {
    if (cache === "warm") await cdp.send("Network.setCacheDisabled", { cacheDisabled: false })
    const start = Date.now()
    await page.goto("http://127.0.0.1:3000/app#comunidade", { waitUntil: "domcontentloaded" })
    await page.getByRole("heading", { name: "Comunidade" }).waitFor()
    report[cache] = { contentReadyMs: Date.now() - start }
  }
  for (const [name, action] of [
    ["filtro", () => page.getByRole("button", { name: "Resolvidas", exact: true }).click()],
    [
      "abrirPergunta",
      () =>
        page
          .getByRole("list", { name: "Perguntas" })
          .getByRole("listitem")
          .first()
          .getByRole("button")
          .click(),
    ],
    ["voltar", () => page.goBack()],
  ]) {
    const before = Date.now()
    await action()
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    )
    report.interactions[name] = Date.now() - before
  }
  const frames = await page.evaluate(async () => {
    const deltas = []
    let previous = performance.now()
    await new Promise((resolve) => {
      const end = performance.now() + 1500
      const tick = (time) => {
        deltas.push(time - previous)
        previous = time
        if (time < end) requestAnimationFrame(tick)
        else resolve()
      }
      requestAnimationFrame(tick)
    })
    return {
      samples: deltas.length,
      droppedOver32ms: deltas.filter((delta) => delta > 32).length,
      frameIntervalsMs: deltas,
    }
  })
  const samples = []
  for (let i = 0; i < 10; i++) {
    await page.getByRole("main").evaluate((main) => {
      main.scrollTop = main.scrollHeight
    })
    await page.waitForTimeout(100)
    samples.push(await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null))
  }
  report.scroll = { pagesLoaded: 10, ...frames }
  report.memory = { afterTenPagesBytes: samples.at(-1), samplesBytes: samples }
  report.transferredBytes = resources.reduce((sum, bytes) => sum + bytes, 0)
} finally {
  await context.close()
  await browser.close()
  writeFileSync(join(output, "celular-report.json"), `${JSON.stringify(report, null, 2)}\n`)
}
