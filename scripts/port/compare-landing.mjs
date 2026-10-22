import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "../bivaque-html/capture-support.mjs"
import { confirmOk, go, settle, snapshot } from "../bivaque-html/proof-harness.mjs"

// PORT-001 (R73): comparação de captura entre o protótipo e o Next.
//
// Gera em .visual/port-001/ os pares lado a lado (protótipo à esquerda, Next à
// direita) em 375 e 1440, nos temas claro e escuro, do topo e da página
// inteira. Também guarda as duas metades separadas, para quem quiser medir
// diferença pixel a pixel.
//
//   node scripts/port/compare-landing.mjs
//
// O protótipo sai de `python scripts/bivaque-html/build.py` e é servido por um
// servidor local, com o mesmo caminho de saída das provas da R71 (Você → Sair →
// confirmar). O Next é o servidor de produção: se não houver um em
// BIVAQUE_NEXT_URL (padrão http://127.0.0.1:3000), o script sobe `next start` e
// derruba no fim. As variáveis do Supabase são necessárias no runtime do Next,
// como no build e no e2e.

const root = resolve(import.meta.dirname, "../..")
const output = join(root, ".visual/port-001")
const candidatePath = join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")
const buildScript = join(root, "scripts/bivaque-html/build.py")
const nextUrl = process.env.BIVAQUE_NEXT_URL ?? "http://127.0.0.1:3000"

const WIDTHS = [375, 1440]
const THEMES = ["light", "dark"]

// Dimensões direto do cabeçalho do PNG: nada de dependência de imagem só para
// relatar o tamanho das capturas.
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

// `next start` sobe dentro de um shell no Windows: matar o shell deixaria o
// processo do servidor vivo segurando a porta.
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

// O protótipo rola dentro de #main, e um contêiner aninhado recebe barra
// clássica (15 px) no Chromium, enquanto a rolagem do documento usa barra
// sobreposta. Sem esconder a barra, o protótipo perde 15 px de largura de
// conteúdo e o texto quebra em outra linha — diferença do contêiner, não do
// desenho.
async function hidePrototypeScrollbar(page) {
  await page.addStyleTag({
    content:
      "#main{scrollbar-width:none} #main::-webkit-scrollbar{display:none} html{scrollbar-width:none}",
  })
}

// Quem saiu vê a landing: o mesmo caminho das provas da R71 (Você → Sair →
// confirmar). O estado de teste fica no localStorage do próprio contexto.
async function signOut(page) {
  await snapshot(page)
  await go(page, "voce")
  await page.locator('#main [data-action="sign-out"]').click()
  await settle(page)
  await confirmOk(page)
  await settle(page)
}

// O topo sai no viewport real da comparação. A página inteira sai com o
// viewport alto o bastante para caber toda a landing: assim o Chromium pinta o
// documento de uma vez, sem costura, e vale igual para os dois lados. Capturar
// o elemento não serve no protótipo — a landing dele rola dentro de #main, e o
// que o contêiner recorta não é pintado na captura além da dobra.
async function capture(page, prefix, width, scrollToTop) {
  await scrollToTop()
  await waitForPage(page)
  const top = await page.screenshot()
  const height = await page.evaluate(() => {
    const landing = document.querySelector("#landing")
    return Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      landing?.scrollHeight ?? 0,
    )
  })
  await page.setViewportSize({ width, height })
  await waitForPage(page)
  // O redimensionamento move a pílula da âncora ativa com transição de 250 ms;
  // sem esta espera a captura pega a pílula no meio do caminho.
  await page.waitForTimeout(400)
  const full = await page.screenshot()
  writeFileSync(join(output, `${prefix}-topo.png`), top)
  writeFileSync(join(output, `${prefix}-inteira.png`), full)
  return { top, full }
}

// Monta o par lado a lado numa página do próprio navegador: nenhuma biblioteca
// de imagem no meio, e a escala é a mesma das duas capturas.
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

const report = { nextUrl, candidateUrl, contexts: [], pageErrors: [] }

try {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const label = `${width} ${theme}`

      const prototypeContext = await createDeterministicContext(browser, { width, theme })
      const prototypePage = await prototypeContext.newPage()
      prototypePage.on("pageerror", (error) =>
        report.pageErrors.push({ side: "protótipo", label, message: error.message }),
      )
      await prototypePage.goto(candidateUrl)
      await prototypePage.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
      await signOut(prototypePage)
      await hidePrototypeScrollbar(prototypePage)
      const prototypeShots = await capture(
        prototypePage,
        `${width}-${theme}-prototipo`,
        width,
        async () => {
          await prototypePage.evaluate(() => {
            const main = document.getElementById("main")
            if (main) main.scrollTop = 0
          })
        },
      )

      const nextContext = await createDeterministicContext(browser, { width, theme })
      const nextPage = await nextContext.newPage()
      nextPage.on("pageerror", (error) =>
        report.pageErrors.push({ side: "next", label, message: error.message }),
      )
      await nextPage.goto(`${nextUrl}/`)
      await nextPage.waitForFunction(() => Boolean(customElements.get("md-filled-button")))
      const nextShots = await capture(nextPage, `${width}-${theme}-next`, width, async () => {
        await nextPage.evaluate(() => window.scrollTo(0, 0))
      })
      writeFileSync(
        join(output, `${width}-${theme}-topo-par.png`),
        await sideBySide(browser, label, prototypeShots.top, nextShots.top),
      )
      writeFileSync(
        join(output, `${width}-${theme}-inteira-par.png`),
        await sideBySide(browser, label, prototypeShots.full, nextShots.full),
      )

      report.contexts.push({
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
} finally {
  await browser.close()
  server.close()
  stopServer(next)
  writeFileSync(join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`)
}

console.log(`capturas em ${output}`)
