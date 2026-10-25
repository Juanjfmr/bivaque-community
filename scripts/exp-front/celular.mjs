#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { chromium, expect } from "@playwright/test"
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
  transferredBytes: { coldOpening: 0, sessionTotal: 0 },
}

const list = () => page.getByRole("list", { name: "Perguntas" })
async function waitForQuestions() {
  await expect(list()).not.toHaveAttribute("aria-busy", "true")
  await expect.poll(() => list().getByRole("listitem").count()).toBeGreaterThan(0)
}

async function measure(name, action, prepare, after) {
  const samplesMs = []
  for (let i = 0; i < 20; i++) {
    await prepare()
    const start = await page.evaluate(() => performance.now())
    await action()
    const end = await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now()))),
        ),
    )
    samplesMs.push(end - start)
    await after()
  }
  const ordered = [...samplesMs].sort((a, b) => a - b)
  const middle = ordered.length / 2
  report.interactions[name] = {
    samples: samplesMs.length,
    medianMs: (ordered[middle - 1] + ordered[middle]) / 2,
    p95Ms: ordered[Math.ceil(ordered.length * 0.95) - 1],
    samplesMs,
  }
}

try {
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true })
  const coldStart = resources.length
  for (const cache of ["cold", "warm"]) {
    if (cache === "warm") await cdp.send("Network.setCacheDisabled", { cacheDisabled: false })
    const start = Date.now()
    await page.goto("http://127.0.0.1:3000/app#comunidade", { waitUntil: "domcontentloaded" })
    await page.getByRole("heading", { name: "Comunidade" }).waitFor()
    await waitForQuestions()
    await page.waitForTimeout(100)
    report[cache] = { contentReadyMs: Date.now() - start }
    if (cache === "cold")
      report.transferredBytes.coldOpening = resources
        .slice(coldStart)
        .reduce((sum, bytes) => sum + bytes, 0)
  }
  const paraAjudar = page.getByRole("button", { name: "Para ajudar", exact: true })
  const resolvidas = page.getByRole("button", { name: "Resolvidas", exact: true })
  await measure(
    "filtro",
    async () => {
      await resolvidas.click()
      await expect(resolvidas).toHaveAttribute("aria-pressed", "true")
    },
    async () => {
      await paraAjudar.click()
      await expect(paraAjudar).toHaveAttribute("aria-pressed", "true")
      await waitForQuestions()
    },
    async () => {
      await paraAjudar.click()
      await expect(paraAjudar).toHaveAttribute("aria-pressed", "true")
      await waitForQuestions()
    },
  )
  const firstQuestion = () => list().getByRole("listitem").first().getByRole("button")
  await measure(
    "abrirPergunta",
    async () => {
      await firstQuestion().click()
      await expect(page).toHaveURL(/#pergunta\//)
    },
    async () => {
      await page.goto("http://127.0.0.1:3000/app#comunidade")
      await waitForQuestions()
    },
    async () => {
      await page.goBack()
      await waitForQuestions()
    },
  )
  await measure(
    "voltar",
    async () => {
      await page.goBack()
      await expect(page).toHaveURL(/#comunidade$/)
    },
    async () => {
      await firstQuestion().click()
      await expect(page).toHaveURL(/#pergunta\//)
    },
    waitForQuestions,
  )

  await page.goto("http://127.0.0.1:3000/app#comunidade")
  await waitForQuestions()
  const itemCounts = [await list().getByRole("listitem").count()]
  for (let pageNumber = 2; pageNumber <= 10; pageNumber++) {
    const before = itemCounts.at(-1)
    const more = page.getByRole("button", { name: /mostrar mais|carregar mais/i }).first()
    await expect(more).toBeVisible()
    await more.scrollIntoViewIfNeeded()
    await more.click()
    await expect.poll(() => list().getByRole("listitem").count()).toBeGreaterThan(before)
    itemCounts.push(await list().getByRole("listitem").count())
  }

  const frames = await page.evaluate(async () => {
    const main = document.querySelector("main")
    if (!main) throw new Error("contêiner principal ausente")
    const deltas = []
    let previous = performance.now()
    const start = main.scrollTop
    const end = main.scrollHeight - main.clientHeight
    const duration = 3000
    await new Promise((resolve) => {
      const tick = (time) => {
        deltas.push(time - previous)
        previous = time
        const progress = Math.min(1, (time - startTime) / duration)
        main.scrollTop = start + (end - start) * progress
        if (progress < 1) requestAnimationFrame(tick)
        else resolve()
      }
      const startTime = performance.now()
      requestAnimationFrame(tick)
    })
    return {
      samples: deltas.length,
      droppedOver32ms: deltas.filter((delta) => delta > 32).length,
      frameIntervalsMs: deltas,
    }
  })
  report.scroll = {
    pagesLoaded: itemCounts.length,
    itemCounts,
    totalItems: itemCounts.at(-1),
    ...frames,
  }
  const memorySamples = []
  for (let i = 0; i < 20; i++) {
    memorySamples.push(await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null))
    await page.waitForTimeout(50)
  }
  const availableMemory = memorySamples.filter((value) => typeof value === "number")
  const distinctMemory = new Set(availableMemory).size
  const rounded =
    distinctMemory < 2 ||
    [1000, 1024, 10_000, 64 * 1024, 100_000, 256 * 1024, 1_000_000, 1024 * 1024].some((step) =>
      availableMemory.every((value) => value % step === 0),
    )
  report.memory = rounded
    ? { afterTenPagesBytes: "sem precisão", samplesBytes: "sem precisão" }
    : { afterTenPagesBytes: availableMemory.at(-1), samplesBytes: availableMemory }
  report.transferredBytes.sessionTotal = resources.reduce((sum, bytes) => sum + bytes, 0)
} finally {
  await context.close()
  await browser.close()
  writeFileSync(join(output, "celular-report.json"), `${JSON.stringify(report, null, 2)}\n`)
}
