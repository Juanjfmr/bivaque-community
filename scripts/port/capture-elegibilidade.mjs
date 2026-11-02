import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "../bivaque-html/capture-support.mjs"
import { action, fill, go, reload, settle } from "../bivaque-html/proof-harness.mjs"

// PORT-004 (lote 4, frente B): comparação de captura da elegibilidade entre o
// protótipo e o Next, com o par lado a lado em 375 e 1440, nos dois temas.
//
//   node scripts/port/capture-elegibilidade.mjs
//
// Telas: CPF (`renderEntryCpf`), resultado (`renderEntryResult`, o ramo "não
// localizamos o vínculo") e análise pendente (`renderEntryPending`).
//
// O protótipo sai de `python scripts/bivaque-html/build.py` e é servido local,
// como em compare-landing.mjs (as funções de build, servidor e captura seguem
// aquele script, que é a referência do PORT-001). O Next é o servidor de
// produção em BIVAQUE_NEXT_URL (padrão http://127.0.0.1:3000): se não houver
// um, o script sobe `next start` e derruba no fim.
//
// Estado de cada lado, e por que parte dele é fixada no transporte:
// - no protótipo, `state.entry` é criado pela própria tela de conta e o
//   resultado vem de `state.test.portal` (o controle de teste do protótipo);
//   a análise pendente é o mesmo estado com `eligibility: 'pending'`;
// - no Next, o seed não tem conta "sem situação", então a resposta de
//   `/api/onboarding/status` e a de `/api/onboarding` são fixadas em
//   `page.route` para os dois primeiros quadros — com o mesmo corpo que as
//   rotas devolvem, e registradas em report.json. A análise pendente é a única
//   que exige estado real no banco: passe BIVAQUE_PENDING_EMAIL com uma conta em
//   análise (a jornada e2e cria uma) e ela é capturada; sem ela, o quadro fica
//   registrado como não capturado, com o motivo, em vez de sair uma tela errada.
//
// Requer BIVAQUE_VISUAL_PASSWORD (a senha descartável do seed) para as rotas com
// sessão. Nada aqui grava linha no banco.

const root = resolve(import.meta.dirname, "../..")
const output = join(root, ".visual/port-004")
const candidatePath = join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")
const buildScript = join(root, "scripts/bivaque-html/build.py")
const nextUrl = process.env.BIVAQUE_NEXT_URL ?? "http://127.0.0.1:3000"
const nextOrigin = new URL(nextUrl).origin

const KEY = "bivaque-material-web-v3"
const VALID_CPF = "123.456.789-09"
const WIDTHS = (process.env.BIVAQUE_PORT_WIDTHS ?? "375,1440").split(",").map(Number)
const THEMES = (process.env.BIVAQUE_PORT_THEMES ?? "light,dark").split(",")

const VISUAL_EMAIL = process.env.BIVAQUE_VISUAL_EMAIL ?? "rejected@bivaque.example.invalid"
const PENDING_EMAIL = process.env.BIVAQUE_PENDING_EMAIL ?? ""

const pngSize = (buffer) => ({
  width: buffer.readUInt32BE(16),
  height: buffer.readUInt32BE(20),
})

function dotEnv(key) {
  try {
    const file = readFileSync(join(root, "apps", "web", ".env.local"), "utf8")
    for (const line of file.split("\n")) {
      const trimmed = line.trim()
      if (trimmed.length === 0 || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      if (trimmed.slice(0, eq).trim() !== key) continue
      return trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
    }
  } catch {
    return undefined
  }
  return undefined
}

const env = (key) => process.env[key] ?? dotEnv(key)

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

// O protótipo rola dentro de #main com barra clássica: sem escondê-la, ele perde
// 15 px de largura de conteúdo e o texto quebra diferente do Next.
async function hidePrototypeScrollbar(page) {
  await page.addStyleTag({
    content:
      "#main{scrollbar-width:none} #main::-webkit-scrollbar{display:none} html{scrollbar-width:none}",
  })
}

// Captura o topo no viewport real e depois a página inteira com o viewport alto
// o bastante para o Chromium pintar tudo de uma vez, sem costura. O viewport
// original volta no fim: as três telas usam a mesma página em sequência.
async function capture(page, prefix, scrollToTop) {
  const original = page.viewportSize()
  await scrollToTop()
  await waitForPage(page)
  const top = await page.screenshot()
  const height = await page.evaluate(() =>
    Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
  )
  await page.setViewportSize({ width: original.width, height })
  await scrollToTop()
  await waitForPage(page)
  await page.waitForTimeout(200)
  const full = await page.screenshot()
  if (original) await page.setViewportSize(original)
  writeFileSync(join(output, `${prefix}-topo.png`), top)
  writeFileSync(join(output, `${prefix}-inteira.png`), full)
  return { top, full }
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

// ── sessão do Next: password grant + cookie/localStorage, como a captura visual ──
async function fetchSession(email) {
  const url = env("NEXT_PUBLIC_SUPABASE_URL") ?? env("SUPABASE_URL")
  const anonKey = env("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  const password = env("BIVAQUE_VISUAL_PASSWORD")

  if (!url || !anonKey || !password) {
    throw new Error(
      "a captura do Next precisa de NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e BIVAQUE_VISUAL_PASSWORD",
    )
  }

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) throw new Error(`entrada de ${email} falhou (HTTP ${response.status})`)

  const ref = new URL(url).hostname.split(".")[0]
  return { storageKey: `sb-${ref}-auth-token`, session: await response.json() }
}

async function applySession(context, auth) {
  const value = `base64-${Buffer.from(JSON.stringify(auth.session)).toString("base64url")}`
  await context.addCookies([
    { name: "bivaque-consent-version", value: "2", url: nextOrigin },
    { name: auth.storageKey, value, url: nextOrigin },
  ])
  await context.addInitScript(
    ([key, session]) => window.localStorage.setItem(key, JSON.stringify(session)),
    [auth.storageKey, auth.session],
  )
}

// ── estados do protótipo ────────────────────────────────────────────────────
async function prototypeSignUp(page) {
  await go(page, "entrar/conta")
  await fill(page, "en-name", "Ana de Teste")
  await fill(page, "en-email", `captura-${Date.now().toString(36)}@exemplo.invalid`)
  await fill(page, "en-pass", "senha-forte-123")
  await page.locator("#en-consent").click()
  await action(page, "entry-signup")
  await settle(page)
  await page.waitForFunction(() => location.hash.includes("/cpf"))
}

async function prototypePatchEntry(page, entryPatch, testPatch) {
  await page.evaluate(
    ([key, entry, test]) => {
      const state = JSON.parse(localStorage.getItem(key))
      state.entry = { ...state.entry, ...entry }
      state.test = { ...state.test, ...test }
      localStorage.setItem(key, JSON.stringify(state))
    },
    [KEY, entryPatch, testPatch ?? {}],
  )
  await reload(page)
}

// ── estados do Next ─────────────────────────────────────────────────────────
async function stubOnboarding(page, { status = null, outcome = null }) {
  await page.route("**/api/onboarding/status", (route) =>
    route.fulfill({
      body: JSON.stringify({ localityMember: false, status }),
      contentType: "application/json",
    }),
  )
  if (outcome) {
    await page.route("**/api/onboarding", (route) =>
      route.fulfill({ body: JSON.stringify({ outcome }), contentType: "application/json" }),
    )
  }
}

async function openNext(page, path) {
  await page.goto(`${nextUrl}${path}`)
  await page.waitForFunction(() => Boolean(customElements.get("md-filled-button")))
  await waitForPage(page)
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

const report = {
  candidateUrl,
  nextUrl,
  screens: [],
  stubs: [
    {
      side: "next",
      route: "/api/onboarding/status",
      usedFor: ["cpf", "resultado"],
      body: { localityMember: false, status: null },
    },
    {
      side: "next",
      route: "/api/onboarding",
      usedFor: ["resultado"],
      body: { outcome: { status: "rejected" } },
    },
  ],
  skipped: [],
  pageErrors: [],
}

try {
  const visualAuth = await fetchSession(VISUAL_EMAIL)
  const pendingAuth = PENDING_EMAIL.length > 0 ? await fetchSession(PENDING_EMAIL) : null

  if (pendingAuth === null) {
    report.skipped.push({
      screen: "analise-pendente",
      reason:
        "BIVAQUE_PENDING_EMAIL não definido: o seed não tem conta em análise. A jornada e2e cria uma; rode-a antes e passe o e-mail dela.",
    })
  }

  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const label = `${width} ${theme}`

      // ── protótipo ──
      const prototypeContext = await createDeterministicContext(browser, { width, theme })
      const prototypePage = await prototypeContext.newPage()
      prototypePage.on("pageerror", (error) =>
        report.pageErrors.push({ side: "protótipo", label, message: error.message }),
      )
      await prototypePage.goto(candidateUrl)
      await prototypePage.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
      await prototypeSignUp(prototypePage)
      await hidePrototypeScrollbar(prototypePage)

      const prototypeTop = () =>
        prototypePage.evaluate(() => {
          const main = document.getElementById("main")
          if (main) main.scrollTop = 0
        })

      const prototypeCpf = await capture(
        prototypePage,
        `${width}-${theme}-cpf-prototipo`,
        prototypeTop,
      )

      await prototypePatchEntry(prototypePage, { eligibility: "none" }, { portal: "notfound" })
      await go(prototypePage, "entrar/cpf")
      await hidePrototypeScrollbar(prototypePage)
      await fill(prototypePage, "en-cpf", VALID_CPF)
      await action(prototypePage, "entry-cpf")
      await prototypePage.waitForFunction(() => location.hash.includes("/resultado"))
      const prototypeResult = await capture(
        prototypePage,
        `${width}-${theme}-resultado-prototipo`,
        prototypeTop,
      )

      await prototypePatchEntry(prototypePage, { doc: null, eligibility: "pending" }, {})
      await go(prototypePage, "entrar/analise")
      await hidePrototypeScrollbar(prototypePage)
      await prototypePage.waitForFunction(() => location.hash.includes("/analise"))
      const prototypePending = await capture(
        prototypePage,
        `${width}-${theme}-analise-prototipo`,
        prototypeTop,
      )

      await prototypeContext.close()

      // ── Next ──
      const nextContext = await createDeterministicContext(browser, { width, theme })
      await applySession(nextContext, visualAuth)
      const nextPage = await nextContext.newPage()
      nextPage.on("pageerror", (error) =>
        report.pageErrors.push({ side: "next", label, message: error.message }),
      )
      await stubOnboarding(nextPage, {
        outcome: { status: "rejected" },
        status: null,
      })

      const nextTop = () => nextPage.evaluate(() => window.scrollTo(0, 0))

      await openNext(nextPage, "/onboarding")
      await nextPage.getByRole("heading", { name: "Confirme seu vínculo." }).waitFor()
      const nextCpf = await capture(nextPage, `${width}-${theme}-cpf-next`, nextTop)

      await nextPage.locator("#onboarding-cpf input").fill(VALID_CPF)
      await nextPage.locator("#onboarding-cpf-submit").click()
      await nextPage.getByRole("heading", { name: "Não localizamos o vínculo." }).waitFor()
      const nextResult = await capture(nextPage, `${width}-${theme}-resultado-next`, nextTop)

      await nextContext.close()

      // Análise pendente do Next: estado real, com a conta indicada.
      let nextPending = null
      if (pendingAuth !== null) {
        const pendingContext = await createDeterministicContext(browser, { width, theme })
        await applySession(pendingContext, pendingAuth)
        const pendingPage = await pendingContext.newPage()
        pendingPage.on("pageerror", (error) =>
          report.pageErrors.push({ side: "next", label, message: error.message }),
        )
        await openNext(pendingPage, "/onboarding/status")

        if (new URL(pendingPage.url()).pathname === "/onboarding/status") {
          await pendingPage.waitForFunction(
            () => (document.querySelector(".en-h1")?.textContent ?? "").trim().length > 0,
          )
          nextPending = await capture(pendingPage, `${width}-${theme}-analise-next`, () =>
            pendingPage.evaluate(() => window.scrollTo(0, 0)),
          )
        } else {
          report.skipped.push({
            screen: "analise-pendente",
            context: label,
            reason: `a conta ${PENDING_EMAIL} não está em análise: ${pendingPage.url()} não é /onboarding/status`,
          })
        }
        await pendingContext.close()
      }

      const pairs = [
        ["cpf", prototypeCpf, nextCpf],
        ["resultado", prototypeResult, nextResult],
        ["analise", prototypePending, nextPending],
      ]

      for (const [screen, prototypeShots, nextShots] of pairs) {
        if (prototypeShots === null || nextShots === null) continue
        writeFileSync(
          join(output, `${width}-${theme}-${screen}-topo-par.png`),
          await sideBySide(browser, label, prototypeShots.top, nextShots.top),
        )
        writeFileSync(
          join(output, `${width}-${theme}-${screen}-inteira-par.png`),
          await sideBySide(browser, label, prototypeShots.full, nextShots.full),
        )
        report.screens.push({
          screen,
          width,
          theme,
          top: { prototype: pngSize(prototypeShots.top), next: pngSize(nextShots.top) },
          full: { prototype: pngSize(prototypeShots.full), next: pngSize(nextShots.full) },
        })
      }

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
for (const skipped of report.skipped) {
  console.log(`não capturado (${skipped.screen}): ${skipped.reason}`)
}
