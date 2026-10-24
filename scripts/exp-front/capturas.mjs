#!/usr/bin/env node
import { spawnSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { createRequire } from "node:module"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { sessionCookies } from "./sessao.mjs"

const root = resolve(import.meta.dirname, "../..")
const label = process.argv[2]
if (!label) throw new Error("uso: node scripts/exp-front/capturas.mjs <rótulo>")
const output = join(root, ".visual/exp-front", label)
const build = spawnSync("python", ["scripts/bivaque-html/build.py"], {
  cwd: root,
  stdio: "inherit",
})
if (build.status !== 0) throw new Error("python scripts/bivaque-html/build.py falhou")
const prototypePath = join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")
const prototype = readFileSync(prototypePath)
const server = createServer((_request, response) =>
  response.writeHead(200, { "content-type": "text/html" }).end(prototype),
)
await new Promise((done) => server.listen(0, "127.0.0.1", done))
mkdirSync(output, { recursive: true })
const require = createRequire(join(root, "apps/web/package.json"))
const sharp = require("sharp")
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
)
const report = {
  prototypeUrl: `http://127.0.0.1:${server.address().port}`,
  candidateUrl: "http://127.0.0.1:3000/app",
  pairs: [],
}

try {
  for (const width of [375, 768, 1440])
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme: theme,
      })
      await context.addCookies(await sessionCookies())
      const [reference, candidate] = await Promise.all([context.newPage(), context.newPage()])
      await reference.goto(report.prototypeUrl)
      await reference.evaluate(() => {
        location.hash = "#comunidade"
      })
      await candidate.goto(`${report.candidateUrl}#comunidade`)
      await candidate.getByRole("heading", { name: "Comunidade" }).waitFor()
      for (const [state, setup] of [
        ["normal", async () => {}],
        [
          "carregando",
          async () => {
            await candidate.route(
              "**/rest/v1/rpc/list_indications**",
              (route) => new Promise((done) => setTimeout(() => done(route.continue()), 1200)),
            )
            await candidate.reload()
          },
        ],
        [
          "erro",
          async () => {
            await candidate.route("**/rest/v1/rpc/list_indications**", (route) =>
              route.abort("failed"),
            )
            await candidate.reload()
          },
        ],
      ]) {
        await setup()
        await candidate.waitForTimeout(state === "carregando" ? 200 : 500)
        const refShot = await reference.screenshot({ fullPage: true })
        const appShot = await candidate.screenshot({ fullPage: true })
        const name = `${width}-${theme}-${state}`
        writeFileSync(join(output, `${name}-prototipo.png`), refShot)
        writeFileSync(join(output, `${name}-candidata.png`), appShot)
        const ref = await sharp(refShot).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
        const app = await sharp(appShot)
          .resize(ref.info.width, ref.info.height, { fit: "fill" })
          .ensureAlpha()
          .raw()
          .toBuffer()
        let changed = 0
        let absolute = 0
        for (let i = 0; i < ref.data.length; i += 4) {
          const pixel =
            Math.abs(ref.data[i] - app[i]) +
            Math.abs(ref.data[i + 1] - app[i + 1]) +
            Math.abs(ref.data[i + 2] - app[i + 2])
          absolute += pixel
          if (pixel > 30) changed++
        }
        const referenceSized = await sharp(refShot)
          .resize(ref.info.width, ref.info.height, { fit: "fill" })
          .png()
          .toBuffer()
        const diff = await sharp(appShot)
          .resize(ref.info.width, ref.info.height, { fit: "fill" })
          .composite([{ input: referenceSized, blend: "difference" }])
          .png()
          .toBuffer()
        writeFileSync(join(output, `${name}-diferenca.png`), diff)
        const appSized = await sharp(appShot)
          .resize(ref.info.width, ref.info.height, { fit: "fill" })
          .png()
          .toBuffer()
        const pair = await sharp({
          create: {
            width: ref.info.width * 2,
            height: ref.info.height,
            channels: 4,
            background: "white",
          },
        })
          .composite([
            { input: referenceSized, left: 0, top: 0 },
            { input: appSized, left: ref.info.width, top: 0 },
          ])
          .png()
          .toBuffer()
        writeFileSync(join(output, `${name}-par.png`), pair)
        report.pairs.push({
          name,
          pixels: ref.info.width * ref.info.height,
          differingPixels: changed,
          differingPercent: (changed / (ref.info.width * ref.info.height)) * 100,
          meanAbsoluteRgbDifference: absolute / (ref.info.width * ref.info.height * 3),
        })
      }
      await context.close()
    }
} finally {
  await browser.close()
  server.close()
  writeFileSync(join(output, "capturas-report.json"), `${JSON.stringify(report, null, 2)}\n`)
}
