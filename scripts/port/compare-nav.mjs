import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "../bivaque-html/capture-support.mjs"

// COM-004: compara a barra e a Comunidade nos dois produtos, em 375/1440 e claro/escuro.
// Rode pela fila: node scripts/agents/prova-fila.mjs -- node scripts/port/compare-nav.mjs

const root = resolve(import.meta.dirname, "../..")
const output = join(root, ".visual/port-nav")
const candidatePath = join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")
const buildScript = join(root, "scripts/bivaque-html/build.py")
const nextUrl = process.env.BIVAQUE_NEXT_URL ?? "http://127.0.0.1:3000"
const WIDTHS = [375, 1440]
const THEMES = ["light", "dark"]
const SCREENS = [
  { name: "inicio-barra", prototypeHash: "inicio", nextPath: "/inicio" },
  { name: "comunidade", prototypeHash: "comunidade", nextPath: "/community" },
]

function runBuild() {
  for (const command of ["python", "python3", "py"]) {
    const result = spawnSync(command, [buildScript], { cwd: root, stdio: "inherit" })
    if (result.error?.code === "ENOENT") continue
    if (result.status !== 0) throw new Error(`${command} scripts/bivaque-html/build.py falhou`)
    return
  }
  throw new Error("nenhum Python encontrado para gerar o protótipo")
}

function envLocal() {
  try {
    return Object.fromEntries(
      readFileSync(join(root, "apps/web/.env.local"), "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=")
          return [
            line.slice(0, index).trim(),
            line
              .slice(index + 1)
              .trim()
              .replace(/^['"]|['"]$/g, ""),
          ]
        }),
    )
  } catch {
    return {}
  }
}

async function session() {
  const local = envLocal()
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    local.NEXT_PUBLIC_SUPABASE_URL
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    local.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const email = process.env.BIVAQUE_VISUAL_EMAIL ?? local.BIVAQUE_VISUAL_EMAIL
  const password = process.env.BIVAQUE_VISUAL_PASSWORD ?? local.BIVAQUE_VISUAL_PASSWORD
  if (!url || !anonKey || !email || !password) {
    throw new Error(
      "defina URL, chave anônima e credenciais de captura no ambiente ou em apps/web/.env.local",
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
  const payload = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: body.expires_at,
    expires_in: body.expires_in,
    token_type: body.token_type,
    user: { id: claims.sub, email, aud: claims.aud, role: claims.role },
  }
  const value = `base64-${Buffer.from(JSON.stringify(payload)).toString("base64url")}`
  const shared = {
    domain: "127.0.0.1",
    path: "/",
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 400,
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }
  return {
    email,
    cookies: [
      { name: `sb-${new URL(url).hostname.split(".")[0]}-auth-token`, value, ...shared },
      { name: "bivaque-consent-version", value: "2", ...shared },
    ],
  }
}

async function reachable(url) {
  try {
    return (await fetch(url, { redirect: "manual" })).status > 0
  } catch {
    return false
  }
}

async function ensureNext() {
  if (await reachable(nextUrl)) return null
  if (!existsSync(join(root, "apps/web/.next/BUILD_ID"))) {
    throw new Error(
      "sem build do Next; rode npx pnpm@11.18.0 --filter web build antes da comparação",
    )
  }
  const child = spawn(
    "npx",
    [
      "pnpm@11.18.0",
      "--filter",
      "web",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      new URL(nextUrl).port || "3000",
    ],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  )
  for (let attempt = 0; attempt < 120; attempt++) {
    if (await reachable(nextUrl)) return child
    await new Promise((done) => setTimeout(done, 1000))
  }
  stopNext(child)
  throw new Error(`o Next não respondeu em ${nextUrl}`)
}

function stopNext(child) {
  if (!child) return
  if (process.platform === "win32")
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" })
  else child.kill()
}

async function capture(page, path) {
  if (path) {
    const response = await page.goto(path, { waitUntil: "networkidle", timeout: 30_000 })
    if (!response?.ok()) throw new Error(`captura não abriu: ${path} (${response?.status() ?? 0})`)
  }
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      Array.from(document.images).map((image) => image.decode().catch(() => undefined)),
    )
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  })
  return page.screenshot()
}

async function sideBySide(browser, label, prototype, next) {
  const context = await browser.newContext({ viewport: { width: 720, height: 400 } })
  const page = await context.newPage()
  const image = (buffer) => `data:image/png;base64,${buffer.toString("base64")}`
  await page.setContent(
    `<body style="margin:0;font:13px system-ui"><div style="display:flex;align-items:flex-start"><figure style="margin:0"><figcaption>Protótipo</figcaption><img src="${image(prototype)}"></figure><figure style="margin:0"><figcaption>Next · ${label}</figcaption><img src="${image(next)}"></figure></div></body>`,
  )
  const result = await page.screenshot({ fullPage: true })
  await context.close()
  return result
}

runBuild()
mkdirSync(output, { recursive: true })
const candidate = readFileSync(candidatePath)
const server = createServer((request, response) => {
  if (new URL(request.url ?? "/", "http://localhost").pathname !== "/candidate.html") {
    return response.writeHead(404).end()
  }
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(candidate)
})
await new Promise((done) => server.listen(0, "127.0.0.1", done))
const candidateUrl = `http://127.0.0.1:${server.address().port}/candidate.html`
const auth = await session()
const next = await ensureNext()
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
)
const report = {
  task: "COM-004",
  nextUrl,
  account: auth.email,
  expectedDifferences: ["A aba Negócios continua fora do Next até a entrega do lote 6."],
  pairs: [],
}

try {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const prototypeContext = await createDeterministicContext(browser, { width, theme })
      const nextContext = await createDeterministicContext(browser, { width, theme })
      await nextContext.addCookies(auth.cookies)
      const prototypePage = await prototypeContext.newPage()
      const nextPage = await nextContext.newPage()
      await nextPage.emulateMedia({ colorScheme: theme })
      await prototypePage.goto(candidateUrl)
      await prototypePage.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
      await prototypePage.addStyleTag({
        content: "#main{scrollbar-width:none} #main::-webkit-scrollbar{display:none}",
      })

      for (const screen of SCREENS) {
        await prototypePage.evaluate((hash) => {
          location.hash = `#${hash}`
        }, screen.prototypeHash)
        await prototypePage.waitForTimeout(300)
        const prototype = await capture(prototypePage)
        const nextShot = await capture(nextPage, `${nextUrl}${screen.nextPath}`)
        const stem = `${width}-${theme}-${screen.name}`
        writeFileSync(join(output, `${stem}-prototipo.png`), prototype)
        writeFileSync(join(output, `${stem}-next.png`), nextShot)
        writeFileSync(
          join(output, `${stem}-par.png`),
          await sideBySide(browser, `${width} ${theme}`, prototype, nextShot),
        )
        report.pairs.push({
          screen: screen.name,
          width,
          theme,
          prototypeHash: `#${screen.prototypeHash}`,
          nextPath: screen.nextPath,
        })
        console.log(`capturado: ${screen.name} ${width} ${theme}`)
      }
      await prototypeContext.close()
      await nextContext.close()
    }
  }
} finally {
  await browser.close()
  server.close()
  stopNext(next)
  writeFileSync(join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`)
}

console.log(`capturas em ${output}`)
