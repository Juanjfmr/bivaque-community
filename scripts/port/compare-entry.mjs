import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "../bivaque-html/capture-support.mjs"

// PORT-003 (frente A do lote 4) — comparação de captura da entrada.
//
// Gera em .visual/port-003/ os pares lado a lado (protótipo à esquerda, Next à
// direita) em 375 e 1440, nos temas claro e escuro, das três telas de
// autenticação que esta frente portou:
//
//   conta   criar conta   `#entrar/conta`   ↔ /signup
//   entrar  entrar        `#entrar/login`   ↔ /login
//   aceite  passo Aceite  `#entrar/aceite`  ↔ /consent
//
//   node scripts/port/compare-entry.mjs
//
// O protótipo sai de `python scripts/bivaque-html/build.py` e é servido por um
// servidor local, como em scripts/port/compare-landing.mjs. O Next é o servidor
// de produção: se não houver um em BIVAQUE_NEXT_URL (padrão
// http://127.0.0.1:3000), o script sobe `next start` e derruba no fim.
//
// A tela do aceite no Next só existe para quem tem sessão — sem ela a rota é
// pública e mostra o caminho de volta (ADR-20260907). Por isso este script
// precisa da conta de captura: `BIVAQUE_VISUAL_EMAIL`/`BIVAQUE_VISUAL_PASSWORD`
// e a URL/chave anônima do Supabase, do ambiente ou de `apps/web/.env.local`
// (lido, nunca escrito). Sem isso ele para com mensagem, em vez de comparar a
// tela errada.
//
// O que a comparação NÃO prova: interação. Captura é prancha parada; os estados
// (erro, enviando, enviado, retomada) têm prova nos specs e2e da frente
// (tests/e2e/port-003-entrada-auth.spec.ts).

const root = resolve(import.meta.dirname, "../..")
const output = join(root, ".visual/port-003")
const candidatePath = join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")
const buildScript = join(root, "scripts/bivaque-html/build.py")
const nextUrl = process.env.BIVAQUE_NEXT_URL ?? "http://127.0.0.1:3000"

const WIDTHS = [375, 1440]
const THEMES = ["light", "dark"]

// As três telas, com o caminho no protótipo (hash) e no Next. `element` é o
// componente do Material que a tela registra no cliente: esperar por ele é o que
// separa "tela pronta" de "esqueleto sem estilo".
const SCREENS = [
  { name: "conta", prototype: "entrar/conta", next: "/signup", element: "md-outlined-text-field" },
  { name: "entrar", prototype: "entrar/login", next: "/login", element: "md-outlined-text-field" },
  // O aceite no Next só existe com sessão (a rota é pública e, sem ela, mostra o
  // caminho de volta); o cookie entra só nesta tela.
  {
    name: "aceite",
    prototype: "entrar/aceite",
    next: "/consent",
    element: "md-checkbox",
    needsSession: true,
  },
]

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

// A sessão de captura: mesma concessão de senha que o e2e usa, com o cookie que
// o /auth/callback escreveria. O valor é base64url do JSON da sessão, o formato
// que o @supabase/ssr desta versão lê de volta.
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
      "a captura do aceite precisa de sessão: defina SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL, " +
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

// O protótipo rola dentro de #main, e um contêiner aninhado recebe barra
// clássica no Chromium enquanto a rolagem do documento usa barra sobreposta.
// Sem esconder a barra, o protótipo perde largura de conteúdo e o texto quebra em
// outra linha — diferença do contêiner, não do desenho.
async function hidePrototypeScrollbar(page) {
  await page.addStyleTag({
    content:
      "#main{scrollbar-width:none} #main::-webkit-scrollbar{display:none} html{scrollbar-width:none}",
  })
}

// Captura o topo no viewport real e a tela inteira num viewport alto o bastante
// para o Chromium pintar tudo de uma vez, sem costura. Vale igual para os dois
// lados: a altura é a maior entre documento e contêiner de rolagem.
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

// O protótipo é um app de página única: o passo é o hash. O aceite não tem
// endereço próprio alcançável sem passar pelo Google (o `entryNext` devolve o
// passo em que a pessoa está), então ele é montado pelo botão — como uma pessoa
// faria.
async function openPrototypeScreen(page, screen) {
  await page.evaluate((hash) => {
    location.hash = hash
  }, screen.prototype)
  await page.waitForTimeout(350)
  if (screen.name === "aceite") {
    await page.locator('#main [data-action="entry-google"][data-value="conta"]').click()
    await page.waitForTimeout(350)
  }
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
  candidateUrl,
  screens: SCREENS.map((screen) => screen.name),
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

      const nextContext = await createDeterministicContext(browser, { width, theme })
      const nextPage = await nextContext.newPage()
      nextPage.on("pageerror", (error) =>
        report.pageErrors.push({ side: "next", label, message: error.message }),
      )

      for (const screen of SCREENS) {
        // O cookie de sessão só vale para o aceite: nas outras duas telas quem
        // decide a tela é o estado público, e uma conta de captura sem
        // membership faria o /login mostrar "Você já começou".
        if (screen.needsSession) await nextContext.addCookies(cookies)
        else await nextContext.clearCookies()

        await openPrototypeScreen(prototypePage, screen)
        const prototypeShots = await capture(
          prototypePage,
          `${width}-${theme}-${screen.name}-prototipo`,
          width,
          async () => {
            await prototypePage.evaluate(() => {
              const main = document.getElementById("main")
              if (main) main.scrollTop = 0
            })
          },
        )

        await nextPage.goto(`${nextUrl}${screen.next}`)
        await nextPage.waitForFunction(
          (element) => Boolean(customElements.get(element)),
          screen.element,
        )
        const nextShots = await capture(
          nextPage,
          `${width}-${theme}-${screen.name}-next`,
          width,
          async () => {
            await nextPage.evaluate(() => window.scrollTo(0, 0))
          },
        )

        writeFileSync(
          join(output, `${width}-${theme}-${screen.name}-par.png`),
          await sideBySide(
            browser,
            `${screen.name} · ${label}`,
            prototypeShots.full,
            nextShots.full,
          ),
        )
        report.pairs.push({
          screen: screen.name,
          width,
          theme,
          prototype: { path: screen.prototype, ...pngSize(prototypeShots.full) },
          next: { path: screen.next, ...pngSize(nextShots.full) },
        })
        console.log(`capturado: ${screen.name} ${label}`)
      }

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
