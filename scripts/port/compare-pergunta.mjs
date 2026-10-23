import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "../bivaque-html/capture-support.mjs"

// Lote 5, tarefa A1 (COM-002) — comparação de captura da tela da pergunta.
//
// Gera em `.visual/port-pergunta/` os pares lado a lado (protótipo à esquerda,
// Next à direita) em 375 e 1440, nos temas claro e escuro, do topo e da página
// inteira. O protótipo é servido do build (`python scripts/bivaque-html/build.py`)
// e a tela da pergunta é aberta como uma pessoa abre: `#comunidade` → primeiro
// pedido da lista. O Next é o servidor de produção, e a tela é o pedido semeado
// resolvido por resposta (a mesma forma nos dois lados: autor, pílula de estado,
// resposta que resolveu).
//
//   node scripts/port/compare-pergunta.mjs
//
// O que a comparação NÃO prova: interação. Captura é prancha parada; o ciclo
// (responder, editar, resolver, reabrir, excluir) tem prova em
// tests/e2e/indicacoes-ciclo-pergunta.spec.ts.

const root = resolve(import.meta.dirname, "../..")
const output = join(root, ".visual/port-pergunta")
const candidatePath = join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")
const buildScript = join(root, "scripts/bivaque-html/build.py")
const nextUrl = process.env.BIVAQUE_NEXT_URL ?? "http://127.0.0.1:3000"
const nextPath =
  process.env.BIVAQUE_PERGUNTA_PATH ?? "/indicacoes/80000000-0000-4000-8000-000000000f01"

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

function envLocal() {
  try {
    const text = readFileSync(join(root, "apps/web/.env.local"), "utf-8")
    const values = {}
    for (const line of text.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      values[trimmed.slice(0, eq).trim()] = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
    }
    return values
  } catch {
    return {}
  }
}

// A tela da pergunta no Next só existe com sessão: a rota é do grupo (shell).
// Mesma concessão de senha que o e2e usa, no cookie que o /auth/callback
// escreveria.
async function sessionCookies() {
  const local = envLocal()
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    local.NEXT_PUBLIC_SUPABASE_URL ??
    local.SUPABASE_URL
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    local.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    local.SUPABASE_ANON_KEY
  const email = process.env.BIVAQUE_VISUAL_EMAIL ?? local.BIVAQUE_VISUAL_EMAIL
  const password = process.env.BIVAQUE_VISUAL_PASSWORD ?? local.BIVAQUE_VISUAL_PASSWORD

  if (!url || !anonKey || !email || !password) {
    throw new Error(
      "a captura da pergunta precisa de sessão: defina SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL, " +
        "a chave anônima e BIVAQUE_VISUAL_EMAIL/BIVAQUE_VISUAL_PASSWORD (ambiente ou apps/web/.env.local)",
    )
  }

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) throw new Error(`entrada da conta de captura falhou (HTTP ${response.status})`)
  const body = await response.json()

  const claims = JSON.parse(Buffer.from(body.access_token.split(".")[1], "base64").toString("utf8"))
  const session = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: body.expires_at,
    expires_in: body.expires_in,
    token_type: body.token_type,
    user: { id: claims.sub, email, aud: claims.aud, role: claims.role },
  }
  const value = `base64-${Buffer.from(JSON.stringify(session), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")}`

  const projectRef = new URL(url).hostname.split(".")[0]
  return [
    {
      name: `sb-${projectRef}-auth-token`,
      value,
      domain: "127.0.0.1",
      path: "/",
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 400,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: "bivaque-consent-version",
      value: "2",
      domain: "127.0.0.1",
      path: "/",
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 400,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]
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

async function capture(page, prefix, width, scrollToTop) {
  await scrollToTop()
  await waitForPage(page)
  const top = await page.screenshot()
  const height = await page.evaluate(() => {
    const main = document.getElementById("main")
    return Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      main?.scrollHeight ?? 0,
    )
  })
  await page.setViewportSize({ width, height: Math.max(height, width === 375 ? 812 : 900) })
  await waitForPage(page)
  const full = await page.screenshot()
  writeFileSync(join(output, `${prefix}-topo.png`), top)
  writeFileSync(join(output, `${prefix}-inteira.png`), full)
  return { top, full }
}

async function sideBySide(browser, label, left, right) {
  const context = await browser.newContext({ viewport: { width: 720, height: 400 } })
  const page = await context.newPage()
  const source = (buffer) => `data:image/png;base64,${buffer.toString("base64")}`
  await page.setContent(
    `<!doctype html><meta charset="utf-8"><body style="margin:0;background:rgb(255 255 255);font:13px/1.4 system-ui,sans-serif">
       <div style="display:flex;align-items:flex-start">
         <figure style="margin:0"><figcaption style="padding:6px 8px;color:rgb(68 68 68)">Protótipo</figcaption>
           <img src="${source(left)}" style="display:block"></figure>
         <figure style="margin:0"><figcaption style="padding:6px 8px;color:rgb(68 68 68)">Next · ${label}</figcaption>
           <img src="${source(right)}" style="display:block"></figure>
       </div>
     </body>`,
  )
  await waitForPage(page)
  const buffer = await page.screenshot({ fullPage: true })
  await context.close()
  return buffer
}

// A tela da pergunta no protótipo não tem endereço alcançável sem sessão de
// demonstração: abre-se pela lista, como uma pessoa faz.
async function openPrototypeQuestion(page) {
  await page.evaluate(() => {
    location.hash = "#comunidade"
  })
  await page.waitForTimeout(350)
  const row = page.locator('#main [data-action="open-question"]').first()
  await row.click()
  await page.waitForFunction(() => location.hash.startsWith("#pergunta/"))
  await page.waitForTimeout(350)
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

const cookies = await sessionCookies()
const next = await ensureNext()
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
)

const report = {
  nextUrl,
  nextPath,
  candidateUrl,
  pairs: [],
  pageErrors: [],
}

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
      await hidePrototypeScrollbar(prototypePage)
      await openPrototypeQuestion(prototypePage)

      const nextContext = await createDeterministicContext(browser, { width, theme })
      await nextContext.addCookies(cookies)
      const nextPage = await nextContext.newPage()
      nextPage.on("pageerror", (error) =>
        report.pageErrors.push({ side: "next", label, message: error.message }),
      )

      const prototypeShots = await capture(
        prototypePage,
        `${width}-${theme}-pergunta-prototipo`,
        width,
        async () => {
          await prototypePage.evaluate(() => {
            const main = document.getElementById("main")
            if (main) main.scrollTop = 0
          })
        },
      )

      await nextPage.goto(`${nextUrl}${nextPath}`)
      await nextPage.waitForSelector("h1")
      const nextShots = await capture(
        nextPage,
        `${width}-${theme}-pergunta-next`,
        width,
        async () => {
          await nextPage.evaluate(() => window.scrollTo(0, 0))
        },
      )

      writeFileSync(
        join(output, `${width}-${theme}-pergunta-par.png`),
        await sideBySide(browser, label, prototypeShots.full, nextShots.full),
      )
      report.pairs.push({
        width,
        theme,
        prototype: {
          hash: await prototypePage.evaluate(() => location.hash),
          ...pngSize(prototypeShots.full),
        },
        next: { path: nextPath, ...pngSize(nextShots.full) },
      })
      console.log(`capturado: pergunta ${label}`)

      await prototypeContext.close()
      await nextContext.close()
    }
  }
} finally {
  await browser.close()
  server.close()
  stopServer(next)
  writeFileSync(join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`)
}

console.log(`capturas em ${output}`)
