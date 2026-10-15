import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext, stabilize } from "./capture-support.mjs"
import { assertRound13Baseline, round13Baseline } from "./round13-baseline.mjs"

const root = resolve(import.meta.dirname, "../..")
const out = join(root, ".visual/bivaque-html-round00-1", `visual-${Date.now()}`)
mkdirSync(out, { recursive: true })
const files = {
  original: join(root, "prototypes/bivaque-html/reference/Bivaque_Material_Web.original.html"),
  baseline: join(root, ".visual/bivaque-html-round00-1/baseline/round00.html"),
  candidate: join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"),
}
const stages = process.argv.includes("--baseline-only")
  ? ["original", "baseline"]
  : Object.keys(files)
const widths = process.argv.includes("--desktop-only") ? [1440] : [375, 768, 1440]
const originalBytes = readFileSync(files.original)
const baseCss = readFileSync(join(root, "prototypes/bivaque-html/src/styles/base.css"), "utf8")
const tabletMarker = "/* At tablet width the 220px desktop side column"
const tabletCorrection = `/* At tablet width the 220px desktop side column gives each area only 52px,
   narrower than its label. Keep the same four areas in a row below search. */
@media(min-width:720px) and (max-width:999px){
 .home-top{grid-template-columns:minmax(0,1fr);gap:4px}
}
`
if (!process.argv.includes("--baseline-only")) {
  assert(baseCss.includes(tabletMarker), "Authorized tablet correction absent")
  assert.equal(
    baseCss.slice(baseCss.indexOf(tabletMarker)),
    tabletCorrection,
    "Only the frozen authorized CSS override may enter the visual oracle",
  )
  stages.splice(stages.indexOf("candidate"), 0, "approved-layout", "round13")
}
const contents = Object.fromEntries(
  Object.entries(files).map(([stage, path]) => [stage, readFileSync(path)]),
)
// Rodada 13: o candidato passa a ser comparado com a base aprovada pelo usuário em
// 2026-10-15. A comparação com o layout aprovado da Rodada 00.1 fica só informativa.
contents.round13 = round13Baseline(root).bytes
assertRound13Baseline(contents.round13)
contents["approved-layout"] = Buffer.from(
  originalBytes.toString("utf8").replace("</style>", `${tabletCorrection}</style>`),
)
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex")
const report = { status: "RUNNING", files: {}, captures: [], comparisons: [], errors: [] }
for (const stage of stages) report.files[stage] = sha(contents[stage])
report.approvedLayout = {
  source: "Frozen original plus only the localized tablet CSS correction",
  css: tabletCorrection,
  cssSha256: sha(Buffer.from(tabletCorrection)),
}
const server = createServer((req, res) => {
  const stage = new URL(req.url, "http://localhost").pathname.slice(1).replace(".html", "")
  if (!stages.includes(stage)) return res.writeHead(404).end()
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(contents[stage])
})
await new Promise((done) => server.listen(0, "127.0.0.1", done))
const origin = `http://127.0.0.1:${server.address().port}`
let browser

function overlap(a, b) {
  return (
    Math.min(a.right, b.right) > Math.max(a.left, b.left) &&
    Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)
  )
}

try {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  const rasterArgs = process.argv.includes("--serial-raster")
    ? ["--disable-gpu", "--disable-threaded-compositing"]
    : []
  browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: rasterArgs,
  })
  report.rasterArgs = rasterArgs
  for (const width of widths) {
    for (const theme of ["light", "dark"]) {
      for (const stage of stages) {
        for (let repeat = 1; repeat <= 3; repeat++) {
          const context = await createDeterministicContext(browser, { width, theme })
          const page = await context.newPage()
          page.on("pageerror", (error) =>
            report.errors.push({ stage, width, theme, error: error.message }),
          )
          try {
            await page.goto(`${origin}/${stage}.html#inicio`)
            const uuidPrefixes = await page.evaluate(() =>
              Array.from({ length: 3 }, () => crypto.randomUUID().replaceAll("-", "").slice(0, 12)),
            )
            assert.equal(new Set(uuidPrefixes).size, 3, "App uid() prefixes must remain unique")
            for (const scene of ["home", "create"]) {
              if (scene === "create") {
                await page.locator('[data-action="create"]:visible').first().click()
                await page.locator("#create-menu").waitFor({ state: "visible" })
                await page.locator("#create-menu.open").waitFor()
              }
              const beforeSettle = performance.now()
              const early = await page.screenshot({
                path: join(out, `early-${stage}-${scene}-${width}-${theme}-${repeat}.png`),
                animations: "allow",
              })
              const readiness = await stabilize(page, { neutralizeInteraction: true })
              const bounds = await page.locator(".home-top .intent span").evaluateAll((labels) =>
                labels.map((label) => ({
                  text: label.textContent,
                  ...label.getBoundingClientRect().toJSON(),
                })),
              )
              const colliding = bounds.flatMap((a, i) =>
                bounds.slice(i + 1).filter((b) => overlap(a, b)),
              )
              const filename = `${stage}-${scene}-${width}-${theme}-${repeat}.png`
              const bytes = await page.screenshot({
                path: join(out, filename),
                animations: "allow",
              })
              // Consecutive frames prove the same render is stable without a timing tolerance.
              await page.evaluate(() => new Promise((done) => requestAnimationFrame(done)))
              const second = await page.screenshot({ animations: "allow" })
              const capture = {
                stage,
                scene,
                width,
                theme,
                repeat,
                filename,
                sha256: sha(bytes),
                consecutiveIdentical: bytes.equals(second),
                earlySha256: sha(early),
                earlyDiffers: !bytes.equals(early),
                settleWallMs: performance.now() - beforeSettle,
                bounds,
                collisions: colliding.length,
                readiness,
              }
              report.captures.push(capture)
              assert(capture.consecutiveIdentical, `Unstable consecutive capture ${filename}`)
            }
          } finally {
            await context.close()
          }
        }
        console.log(`Captured ${stage} ${width} ${theme}: 3 repetitions`)
      }
    }
  }
  for (const width of widths) {
    for (const theme of ["light", "dark"]) {
      for (const scene of ["home", "create"]) {
        const captures = report.captures.filter(
          (c) => c.width === width && c.theme === theme && c.scene === scene,
        )
        const repeatStable = stages.every(
          (stage) =>
            new Set(captures.filter((c) => c.stage === stage).map((c) => c.sha256)).size === 1,
        )
        const original = captures.find((c) => c.stage === "original")
        const baseline = captures.find((c) => c.stage === "baseline")
        const candidate = captures.find((c) => c.stage === "candidate")
        const approved = captures.find((c) => c.stage === "approved-layout")
        const round13 = captures.find((c) => c.stage === "round13")
        report.comparisons.push({
          width,
          theme,
          scene,
          repeatStable,
          originalBaselineIdentical: original.sha256 === baseline.sha256,
          candidateIdentical: candidate ? candidate.sha256 === original.sha256 : null,
          approvedLayoutIdentical: candidate ? candidate.sha256 === approved.sha256 : null,
          round13Identical: candidate ? candidate.sha256 === round13.sha256 : null,
          candidateCollisions: candidate?.collisions ?? null,
        })
      }
    }
  }
  const failed =
    report.errors.length ||
    report.comparisons.some(
      (c) =>
        !c.repeatStable ||
        !c.originalBaselineIdentical ||
        c.round13Identical === false ||
        (c.candidateCollisions !== null && c.candidateCollisions > 0),
    )
  report.status = failed ? "FAIL" : "PASS"
} catch (error) {
  report.status = "FAIL"
  report.errors.push({ error: error.message })
} finally {
  await browser?.close()
  await new Promise((done) => server.close(done))
  writeFileSync(join(out, "visual-stability.json"), `${JSON.stringify(report, null, 2)}\n`)
  console.log(`${report.status}: ${out}`)
  process.exitCode = report.status === "PASS" ? 0 : 1
}
