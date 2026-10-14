import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { createRequire } from "node:module"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext, stabilize } from "./capture-support.mjs"

const root = resolve(import.meta.dirname, "../..")
const output = resolve(
  root,
  process.env.BIVAQUE_HTML_PROOF_OUT ??
    `.visual/bivaque-html-round01/independent-visual-${Date.now()}`,
)
const files = {
  baseline: join(root, ".visual/bivaque-html-round01/baseline/round001.html"),
  candidate: join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html"),
}
const baselineRevision = "217cdc9fa54fc16ac36e53cf83cf90071bef076e"
let baselineProvenance = { method: "frozen local file", path: files.baseline }
function frozenBaseline() {
  try {
    return readFileSync(files.baseline)
  } catch (error) {
    if (error.code !== "ENOENT") throw error
    const gitSource = (relative) => {
      assert(typeof relative === "string" && relative.length > 0)
      const normalized = relative.replaceAll("\\", "/")
      assert(
        !normalized.startsWith("/") &&
          !normalized.includes(":") &&
          !normalized.split("/").includes(".."),
      )
      return execFileSync(
        "git",
        ["show", `${baselineRevision}:prototypes/bivaque-html/src/${normalized}`],
        { cwd: root, maxBuffer: 16 * 1024 * 1024 },
      )
    }
    const manifest = JSON.parse(gitSource("manifest.json"))
    assert.equal(manifest.formatVersion, 1)
    assert.equal(manifest.slots.length, 4)
    let bytes = gitSource(manifest.template)
    for (const slot of manifest.slots) {
      const token = Buffer.from(slot.token)
      const start = bytes.indexOf(token)
      assert(
        start >= 0 && bytes.lastIndexOf(token) === start,
        "Frozen template token must occur once",
      )
      const content = Buffer.concat(slot.files.map(gitSource))
      bytes = Buffer.concat([
        bytes.subarray(0, start),
        content,
        bytes.subarray(start + token.length),
      ])
    }
    baselineProvenance = {
      method: "raw Git blobs, byte concatenation only",
      revision: baselineRevision,
      sourceRoot: "prototypes/bivaque-html/src/",
      expectedHash: "3a89428131ea76386ca0966d8dc7964cb0b7a58e398ed350a88148e35682e8c2",
    }
    return bytes
  }
}
const contents = { baseline: frozenBaseline(), candidate: readFileSync(files.candidate) }
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex")
assert.equal(
  sha(contents.baseline),
  "3a89428131ea76386ca0966d8dc7964cb0b7a58e398ed350a88148e35682e8c2",
  "Previous-round visual baseline must remain frozen",
)
const { PNG } = createRequire(import.meta.url)("pngjs")
const report = {
  status: "RUNNING",
  scriptHash: sha(readFileSync(import.meta.filename)),
  hashes: Object.fromEntries(Object.entries(contents).map(([stage, bytes]) => [stage, sha(bytes)])),
  baselineProvenance,
  captures: [],
  comparisons: [],
  errors: [],
}
const launchArgs = process.argv.includes("--deterministic-renderer")
  ? ["--disable-gpu", "--force-color-profile=srgb"]
  : []
report.launchArgs = launchArgs
mkdirSync(output, { recursive: true })
const server = createServer((req, res) => {
  const stage = new URL(req.url, "http://localhost").pathname.slice(1).replace(".html", "")
  if (!contents[stage]) return res.writeHead(404).end()
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(contents[stage])
})
await new Promise((done) => server.listen(0, "127.0.0.1", done))
const url = `http://127.0.0.1:${server.address().port}`
let browser
function difference(a, b) {
  const first = PNG.sync.read(a),
    second = PNG.sync.read(b)
  assert.equal(first.width, second.width)
  assert.equal(first.height, second.height)
  let count = 0,
    maximum = 0,
    left = first.width,
    top = first.height,
    right = -1,
    bottom = -1
  for (let n = 0; n < first.data.length; n += 4) {
    let changed = false
    for (let channel = 0; channel < 4; channel++) {
      const delta = Math.abs(first.data[n + channel] - second.data[n + channel])
      maximum = Math.max(maximum, delta)
      changed ||= delta !== 0
    }
    if (changed) {
      count++
      const index = n / 4,
        x = index % first.width,
        y = Math.floor(index / first.width)
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }
  return {
    changedPixels: count,
    maximumChannelDelta: maximum,
    boundingBox: count ? [left, top, right + 1, bottom + 1] : null,
  }
}
function changedOffsets(a, b) {
  const offsets = new Set()
  for (let n = 0; n < a.length; n += 4)
    if (a[n] !== b[n] || a[n + 1] !== b[n + 1] || a[n + 2] !== b[n + 2] || a[n + 3] !== b[n + 3])
      offsets.add(n)
  return offsets
}
function renderNoise(frames, scene) {
  const read = (stage) =>
    [1, 2, 3].map((repeat) => PNG.sync.read(frames.get(`${stage}-${scene}-${repeat}`)).data)
  const baseline = read("baseline"),
    candidate = read("candidate")
  const unstable = new Set()
  for (const replicas of [baseline, candidate])
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++)
        for (const offset of changedOffsets(replicas[i], replicas[j])) unstable.add(offset)
  const crossStage = new Set()
  for (const b of baseline)
    for (const c of candidate) for (const offset of changedOffsets(b, c)) crossStage.add(offset)
  const outside = [...crossStage].filter((offset) => !unstable.has(offset)).length
  return { unstable: unstable.size, crossStage: crossStage.size, outside }
}
async function capture(page, stage, scene, width, theme, repeat, strict) {
  await stabilize(page, { neutralizeInteraction: true })
  const filename = `${stage}-${scene}-${width}-${theme}-${repeat}.png`
  const bytes = await page.screenshot({ path: join(output, filename), animations: "allow" })
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(done)))
  const second = await page.screenshot({ animations: "allow" })
  const metadata = await page.evaluate(() => ({
    route: window.Bivaque.inspect().route,
    overflow: document.documentElement.scrollWidth > innerWidth,
    theme: document.documentElement.dataset.theme,
    heading: document.querySelector("#main h1")?.textContent,
  }))
  const rendering = await page.evaluate(() => {
    const visible = Array.from(
      document.querySelectorAll("#main *,#topbar *,#nav *,#fab,#create-menu,#create-menu *"),
    ).filter((element) => {
      const bounds = element.getBoundingClientRect()
      return bounds.width > 0 && bounds.height > 0 && bounds.top < innerHeight && bounds.bottom > 0
    })
    const properties = [
      "backgroundColor",
      "color",
      "opacity",
      "filter",
      "backdropFilter",
      "boxShadow",
      "borderRadius",
      "borderColor",
      "fontFamily",
      "fontSize",
      "fontWeight",
      "lineHeight",
      "transform",
    ]
    const geometry = visible.map((element) => ({
      tag: element.tagName,
      id: element.id,
      class: typeof element.className === "string" ? element.className : "",
      action: element.dataset?.action,
      value: element.dataset?.value,
      bounds: element.getBoundingClientRect().toJSON(),
    }))
    const styles = visible.map((element) => {
      const css = getComputedStyle(element)
      return Object.fromEntries(properties.map((property) => [property, css[property]]))
    })
    const images = visible
      .filter((element) => element.tagName === "IMG")
      .map((element) => ({
        source: element.currentSrc,
        naturalWidth: element.naturalWidth,
        naturalHeight: element.naturalHeight,
      }))
    return { markup: document.querySelector("#page")?.innerHTML ?? "", geometry, styles, images }
  })
  const renderingHashes = Object.fromEntries(
    Object.entries(rendering).map(([name, value]) => [
      name,
      sha(Buffer.from(typeof value === "string" ? value : JSON.stringify(value))),
    ]),
  )
  report.captures.push({
    stage,
    scene,
    width,
    theme,
    repeat,
    strict,
    filename,
    sha256: sha(bytes),
    consecutiveIdentical: bytes.equals(second),
    renderingHashes,
    ...metadata,
  })
  assert(bytes.equals(second), `Unstable final render: ${filename}`)
  return bytes
}
try {
  browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
    args: launchArgs,
  })
  for (const width of [375, 768, 1440])
    for (const theme of ["light", "dark"]) {
      const frames = new Map()
      for (const stage of ["baseline", "candidate"])
        for (let repeat = 1; repeat <= 3; repeat++) {
          const context = await createDeterministicContext(browser, { width, theme }),
            page = await context.newPage()
          page.on("pageerror", (error) =>
            report.errors.push({ stage, width, theme, message: error.message }),
          )
          try {
            await page.goto(`${url}/${stage}.html#inicio`)
            for (const scene of ["home", "create"]) {
              if (scene === "create")
                await page.locator('[data-action="create"]:visible').first().click()
              const bytes = await capture(page, stage, scene, width, theme, repeat, true)
              frames.set(`${stage}-${scene}-${repeat}`, bytes)
            }
            if (repeat === 1)
              for (const scene of ["guia", "agenda", "salvos", "meus-anuncios", "voce"]) {
                await page.goto("about:blank")
                await page.goto(`${url}/${stage}.html#${scene}`)
                const bytes = await capture(page, stage, scene, width, theme, repeat, false)
                frames.set(`${stage}-${scene}-1`, bytes)
              }
          } finally {
            await context.close()
          }
        }
      for (const scene of ["home", "create", "guia", "agenda", "salvos", "meus-anuncios", "voce"]) {
        const strict = ["home", "create"].includes(scene)
        const baseline = frames.get(`baseline-${scene}-1`),
          candidate = frames.get(`candidate-${scene}-1`)
        const repeated =
          !strict ||
          ["baseline", "candidate"].every((stage) =>
            [2, 3].every((repeat) =>
              frames.get(`${stage}-${scene}-${repeat}`).equals(frames.get(`${stage}-${scene}-1`)),
            ),
          )
        // O Chromium não reproduz bytes idênticos entre contextos nem para o mesmo HTML.
        // Zona instável = pixels que variam entre réplicas do MESMO estágio. Uma mudança real
        // aparece em pixel estável; logo, toda diferença base×candidato deve cair na zona instável.
        const noise = strict ? renderNoise(frames, scene) : null
        report.comparisons.push({
          unstablePixels: noise?.unstable,
          crossStagePixels: noise?.crossStage,
          crossStageOutsideUnstable: noise?.outside,
          withinNoise: !strict || noise.outside === 0,
          width,
          theme,
          scene,
          strict,
          repeated,
          identicalPixels: baseline.equals(candidate),
          ...difference(baseline, candidate),
          rendering: Object.fromEntries(
            ["markup", "geometry", "styles", "images"].map((name) => {
              const captures = report.captures.filter(
                (capture) =>
                  capture.width === width && capture.theme === theme && capture.scene === scene,
              )
              const base = captures.find(
                (capture) => capture.stage === "baseline" && capture.repeat === 1,
              ).renderingHashes[name]
              const generated = captures.find(
                (capture) => capture.stage === "candidate" && capture.repeat === 1,
              ).renderingHashes[name]
              return [
                name,
                {
                  baselineCandidateEqual: base === generated,
                  baselineRepeatsEqual:
                    new Set(
                      captures
                        .filter((capture) => capture.stage === "baseline")
                        .map((capture) => capture.renderingHashes[name]),
                    ).size === 1,
                  candidateRepeatsEqual:
                    new Set(
                      captures
                        .filter((capture) => capture.stage === "candidate")
                        .map((capture) => capture.renderingHashes[name]),
                    ).size === 1,
                },
              ]
            }),
          ),
          adjudication: strict
            ? "DOM/geometry/styles/images hashes equal; baseline/candidate pixel deltas only inside renderer-unstable zone"
            : "Inspect deltas: only explicit feedback/empty-state/navigation repairs allowed",
        })
      }
      console.log(
        `Visual ${width} ${theme}: baseline/candidate, 3 Home/Create repetitions and 5 global views`,
      )
    }
  report.status =
    !report.errors.length &&
    report.captures.every((c) => c.consecutiveIdentical && !c.overflow) &&
    report.comparisons
      .filter((c) => c.strict)
      .every(
        (c) =>
          c.withinNoise &&
          Object.values(c.rendering).every(
            (r) => r.baselineCandidateEqual && r.baselineRepeatsEqual && r.candidateRepeatsEqual,
          ),
      )
      ? "PASS_STRICT_SHELL_GLOBAL_REVIEW_REQUIRED"
      : "FAIL"
} catch (error) {
  report.status = "BLOCKED"
  report.errors.push({ message: error.stack })
} finally {
  await browser?.close()
  await new Promise((done) => server.close(done))
  writeFileSync(join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`)
  console.log(`${report.status}: ${output}`)
  process.exitCode = report.status === "PASS_STRICT_SHELL_GLOBAL_REVIEW_REQUIRED" ? 0 : 1
}
