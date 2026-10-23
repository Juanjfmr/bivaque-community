import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "../bivaque-html/capture-support.mjs"
import { action, fill, go, settle, snapshot } from "../bivaque-html/proof-harness.mjs"

// PORT-006 (lote 4 da entrada): comparação de captura das três telas públicas
// que esta frente entregou — convite por código, conta apagada e Ajuda.
//
// Mesma mecânica do PORT-001 (scripts/port/compare-landing.mjs): o protótipo à
// esquerda, o Next à direita, em 375 e 1440, nos temas claro e escuro, o topo e
// a página inteira, mais as metades separadas para medir diferença pixel a
// pixel. Cada tela sai em contexto próprio porque duas delas dependem de estado
// do protótipo: a Ajuda e o convite só usam a casca da entrada quando a pessoa
// está fora, e a conta apagada só existe depois de a conta ser apagada.
//
//   node scripts/port/compare-entrada-publica.mjs
//
// Requer o build do Next (apps/web/.next/BUILD_ID) ou um servidor em
// BIVAQUE_NEXT_URL (padrão http://127.0.0.1:3000). A tela do convite do Next é
// capturada SEM código: com código válido ela viraria o formulário de conta, e
// o protótipo não tem código real para comparar.

const root = resolve(import.meta.dirname, "../..")
const output = join(root, ".visual/port-006")
const candidatePath = join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")
const buildScript = join(root, "scripts/bivaque-html/build.py")
const nextUrl = process.env.BIVAQUE_NEXT_URL ?? "http://127.0.0.1:3000"

const WIDTHS = [375, 1440]
const THEMES = ["light", "dark"]

const pngSize = (buffer) => ({
  width: buffer.readUInt32BE(16),
  height: buffer.readUInt32BE(20),
})

function runBuild() {
  for (const command of ["python", "python3", "py"]) {
    const result = spawnSync(command, [buildScript], { cwd: root, stdio: "inherit" })
    if (result.error?.code === "ENOENT") continue
    if (result.status !== 0) throw new Error(`${command} scripts/bivaque-html/build.py falhou`)
    return
  }
  throw new Error("nenhum python encontrado para gerar o protótipo (python, python3, py)")
}

async function reachable(url) {
  try {
    const response = await fetch(url, { redirect: "manual" })
    return response.status > 0
  } catch {
    return false
  }
}

async function ensureNext() {
  if (await reachable(nextUrl)) return null
  if (!existsSync(join(root, "apps/web/.next/BUILD_ID")))
    throw new Error(
      "não há build do Next: rode `npx pnpm@11.18.0 --filter web build` antes da comparação",
    )
  const port = new URL(nextUrl).port || "3000"
  const child = spawn(
    "npx",
    ["pnpm@11.18.0", "--filter", "web", "start", "--hostname", "127.0.0.1", "--port", port],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  )
  for (let attempt = 0; attempt < 120; attempt++) {
    if (await reachable(nextUrl)) return child
    await new Promise((done) => setTimeout(done, 1000))
  }
  stopServer(child)
  throw new Error(`o Next não respondeu em ${nextUrl}`)
}

function stopServer(child) {
  if (!child) return
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" })
    return
  }
  child.kill()
}

async function waitForPage(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      Array.from(document.images).map((image) => image.decode().catch(() => undefined)),
    )
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  })
}

async function hidePrototypeScrollbar(page) {
  await page.addStyleTag({
    content:
      "#main{scrollbar-width:none} #main::-webkit-scrollbar{display:none} html{scrollbar-width:none}",
  })
}

// Quem saiu vê a casca da entrada: o caminho das provas da R71 (Você → Sair →
// confirmar).
async function signOut(page) {
  await snapshot(page)
  await go(page, "voce")
  await page.locator('#main [data-action="sign-out"]').click()
  await settle(page)
  await page.locator("#dialog [data-action]").first().click()
  await settle(page)
}

// A conta apagada existe só depois de apagar: a tela pede a palavra e navega.
async function deletePrototypeAccount(page) {
  await go(page, "apagar-conta")
  await fill(page, "delete-word", "APAGAR")
  await action(page, "account-delete")
  await settle(page)
}

const SCREENS = [
  {
    id: "convite",
    next: "/convite",
    prototype: async (page) => {
      await signOut(page)
      await go(page, "entrar/convite")
    },
  },
  {
    id: "conta-apagada",
    next: "/conta-apagada",
    prototype: async (page) => {
      await deletePrototypeAccount(page)
    },
  },
  {
    id: "ajuda",
    next: "/ajuda",
    prototype: async (page) => {
      await signOut(page)
      await go(page, "ajuda")
    },
  },
]

async function capture(page, prefix, width, scrollToTop) {
  await scrollToTop()
  await waitForPage(page)
  const top = await page.screenshot()
  const height = await page.evaluate(() =>
    Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.querySelector("#main")?.scrollHeight ?? 0,
    ),
  )
  await page.setViewportSize({ width, height })
  await waitForPage(page)
  await page.waitForTimeout(400)
  const full = await page.screenshot()
  writeFileSync(join(output, `${prefix}-topo.png`), top)
  writeFileSync(join(output, `${prefix}-inteira.png`), full)
  return { full, top }
}

async function sideBySide(browser, label, left, right) {
  const context = await browser.newContext({ viewport: { width: 720, height: 400 } })
  const page = await context.newPage()
  const source = (buffer) => `data:image/png;base64,${buffer.toString("base64")}`
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#ffffff;font:13px/1.4 system-ui,sans-serif">
       <div style="display:flex;align-items:flex-start">
         <figure style="margin:0"><figcaption style="padding:6px 8px;color:#444444">Protótipo</figcaption>
           <img src="${source(left)}" style="display:block"></figure>
         <figure style="margin:0"><figcaption style="padding:6px 8px;color:#444444">Next · ${label}</figcaption>
           <img src="${source(right)}" style="display:block"></figure>
       </div>
     </body>`,
  )
  await waitForPage(page)
  const buffer = await page.screenshot({ fullPage: true })
  await context.close()
  return buffer
}

runBuild()
mkdirSync(output, { recursive: true })

const candidate = readFileSync(candidatePath)
const server = createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://localhost").pathname
  if (path === "/favicon.ico") return response.writeHead(204).end()
  if (path !== "/candidate.html") return response.writeHead(404).end()
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(candidate)
})
await new Promise((done) => server.listen(0, "127.0.0.1", done))
const candidateUrl = `http://127.0.0.1:${server.address().port}/candidate.html`

const next = await ensureNext()
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
)

const report = { nextUrl, candidateUrl, screens: [], pageErrors: [] }

try {
  for (const screen of SCREENS) {
    for (const width of WIDTHS) {
      for (const theme of THEMES) {
        const label = `${screen.id} ${width} ${theme}`

        const prototypeContext = await createDeterministicContext(browser, { width, theme })
        const prototypePage = await prototypeContext.newPage()
        prototypePage.on("pageerror", (error) =>
          report.pageErrors.push({ side: "protótipo", label, message: error.message }),
        )
        await prototypePage.goto(candidateUrl)
        await prototypePage.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
        await screen.prototype(prototypePage)
        await hidePrototypeScrollbar(prototypePage)
        const prototypeShots = await capture(
          prototypePage,
          `${screen.id}-${width}-${theme}-prototipo`,
          width,
          async () => {
            await prototypePage.evaluate(() => {
              const main = document.getElementById("main")
              if (main) main.scrollTop = 0
              window.scrollTo(0, 0)
            })
          },
        )

        const nextContext = await createDeterministicContext(browser, { width, theme })
        const nextPage = await nextContext.newPage()
        nextPage.on("pageerror", (error) =>
          report.pageErrors.push({ side: "next", label, message: error.message }),
        )
        await nextPage.goto(`${nextUrl}${screen.next}`)
        await nextPage.waitForFunction(() => Boolean(customElements.get("md-filled-button")))
        const nextShots = await capture(
          nextPage,
          `${screen.id}-${width}-${theme}-next`,
          width,
          async () => {
            await nextPage.evaluate(() => window.scrollTo(0, 0))
          },
        )

        writeFileSync(
          join(output, `${screen.id}-${width}-${theme}-topo-par.png`),
          await sideBySide(browser, label, prototypeShots.top, nextShots.top),
        )
        writeFileSync(
          join(output, `${screen.id}-${width}-${theme}-inteira-par.png`),
          await sideBySide(browser, label, prototypeShots.full, nextShots.full),
        )

        report.screens.push({
          id: screen.id,
          width,
          theme,
          top: { prototype: pngSize(prototypeShots.top), next: pngSize(nextShots.top) },
          full: { prototype: pngSize(prototypeShots.full), next: pngSize(nextShots.full) },
        })

        await prototypeContext.close()
        await nextContext.close()
        console.log(`capturado: ${label}`)
      }
    }
  }
} finally {
  await browser.close()
  server.close()
  stopServer(next)
  writeFileSync(join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`)
}

console.log(`capturas em ${output}`)
