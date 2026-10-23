import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"
import { createDeterministicContext } from "../bivaque-html/capture-support.mjs"

// COM-003 (B1 do lote 5) — comparação de captura dos grupos.
//
// Gera em .visual/com-003/ os pares lado a lado (protótipo à esquerda, Next à
// direita) em 375 e 1440, nos temas claro e escuro, das telas que esta frente
// entregou:
//
//   lista     aba Grupos         `#comunidade` (aba Grupos)    ↔ /groups
//   criar     Criar grupo        `#comunidade` + diálogo       ↔ /groups + formulário
//   detalhe   grupo com regras   `#grupo/g-familias`           ↔ /groups/<id>
//   gerenciar Gerenciar (admin)  `#grupo/g-futebol` + diálogo  ↔ /groups/<id>
//
//   node scripts/agents/prova-fila.mjs -- node scripts/port/compare-groups.mjs
//
// O protótipo sai de `python scripts/bivaque-html/build.py` e é servido por um
// servidor local, como em compare-entry.mjs. O Next é o servidor de produção: se
// não houver um em BIVAQUE_NEXT_URL (padrão http://127.0.0.1:3000), o script sobe
// `next start` e derruba no fim. Como o Next ocupa a porta 3000 compartilhada, a
// comparação roda dentro da fila de provas.
//
// As telas de grupo ainda não foram portadas para a pele Material Web
// (ADR-20261022, migração tela a tela). A comparação registra a composição, os
// rótulos e os textos entregues contra o protótipo; a diferença de pele é
// esperada e fica visível no par — não é regressão desta frente.
//
// A conta de captura é a do seed: BIVAQUE_VISUAL_EMAIL/BIVAQUE_VISUAL_PASSWORD e
// a URL/chave anônima do Supabase, do ambiente. Sem isso o script para com
// mensagem, em vez de comparar a tela errada.

const root = resolve(import.meta.dirname, "../..")
const output = join(root, ".visual/com-003")
const candidatePath = join(root, "prototypes/bivaque-html/dist/Bivaque_Material_Web.html")
const buildScript = join(root, "scripts/bivaque-html/build.py")
const nextUrl = process.env.BIVAQUE_NEXT_URL ?? "http://127.0.0.1:3000"

const WIDTHS = [375, 1440]
const THEMES = ["light", "dark"]

// A senha do cookie de navegação é a mesma versão de @bivaque/domain
// (CONSENT_VERSION), como em scripts/visual/capture.mjs: um scope test garante
// que ela não anda sozinha.
const CONSENT_COOKIE = { name: "bivaque-consent-version", value: "2" }

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
// que o @supabase/ssr desta versão lê de volta. Aqui a sessão vale para TODAS as
// telas: /groups é rota protegida.
async function session() {
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
      "a comparação precisa de sessão: defina SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL, " +
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
  const payload = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: body.expires_at,
    expires_in: body.expires_in,
    token_type: body.token_type,
    user: { id: claims.sub, email, aud: claims.aud, role: claims.role },
  }
  const value = `base64-${Buffer.from(JSON.stringify(payload), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")}`

  const projectRef = new URL(url).hostname.split(".")[0]
  const cookies = [
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
    { ...CONSENT_COOKIE, domain: "127.0.0.1", path: "/" },
  ]

  return { cookies, url, anonKey, token: body.access_token, email }
}

// O grupo da tela de detalhe: o mais recente com regras — na prática o grupo que
// a prova e2e cria, com regras, publicação fixada e o dono na sessão. Sem nenhum
// com regras, cai para o mais recente visível, e o relatório diz qual foi.
async function captureGroup({ url, anonKey, token }) {
  const headers = { apikey: anonKey, Authorization: `Bearer ${token}` }
  const queries = [
    "select=id,name&rules=not.is.null&order=created_at.desc&limit=1",
    "select=id,name&order=created_at.desc&limit=1",
  ]
  for (const query of queries) {
    const response = await fetch(`${url}/rest/v1/groups?${query}`, { headers })
    if (!response.ok) throw new Error(`consulta de grupos falhou (HTTP ${response.status})`)
    const rows = await response.json()
    if (rows[0]?.id) return rows[0]
  }
  throw new Error("nenhum grupo visível para a conta de captura")
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

// O protótipo rola dentro de #main, e um contêiner aninhado recebe barra clássica
// no Chromium enquanto a rolagem do documento usa barra sobreposta. Sem esconder
// a barra, o protótipo perde largura de conteúdo e o texto quebra em outra linha —
// diferença do contêiner, não do desenho.
async function hidePrototypeScrollbar(page) {
  await page.addStyleTag({
    content:
      "#main{scrollbar-width:none} #main::-webkit-scrollbar{display:none} html{scrollbar-width:none}",
  })
}

async function scrollToTop(page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    const main = document.getElementById("main") ?? document.querySelector("main")
    if (main) main.scrollTop = 0
  })
}

// Captura o topo no viewport real e a tela inteira num viewport alto o bastante
// para o Chromium pintar tudo de uma vez, sem costura. A altura é a maior entre
// documento e contêiner de rolagem — vale para o protótipo (#main) e para o Next.
async function capture(page, prefix, width) {
  await scrollToTop(page)
  await waitForPage(page)
  const top = await page.screenshot()
  const height = await page.evaluate(() => {
    const main = document.getElementById("main") ?? document.querySelector("main")
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

// O protótipo é um app de página única: o passo é o hash, e a aba de grupos vive
// em memória (`communityTab`), sem endereço próprio — por isso ela é alcançada
// pelo toque na aba, como uma pessoa faria. Cada tela começa com a página
// recarregada, para o diálogo de uma não aparecer na captura da seguinte.
async function openPrototypeScreen(page, candidateUrl, screen) {
  await page.goto(candidateUrl)
  await page.waitForFunction(() => window.Bivaque?.inspect().officialComponents)
  await hidePrototypeScrollbar(page)
  await page.evaluate((hash) => {
    location.hash = hash
  }, screen.prototypeHash)
  await page.waitForTimeout(350)
  if (screen.prototypeAction) await screen.prototypeAction(page)
  await page.locator(screen.prototypeReady).first().waitFor({ timeout: 15_000 })
  await page.waitForTimeout(200)
}

async function openGroupsTab(page) {
  await page.locator('#main [data-action="community-tab"][data-value="grp"]').first().click()
  await page.locator("#groups-body").first().waitFor({ timeout: 15_000 })
}

async function openGroupCreator(page) {
  await page.locator('#main [data-action="create-group"]').first().click()
  await page.locator("#group-name").first().waitFor({ timeout: 15_000 })
}

async function openGroupManage(page) {
  await page.locator('#main [data-action="manage-group"]').first().click()
  await page.locator("#manage-rules").first().waitFor({ timeout: 15_000 })
}

function screens(group) {
  return [
    {
      name: "lista",
      prototypeHash: "comunidade",
      prototypeAction: openGroupsTab,
      prototypeReady: "#groups-body",
      next: "/groups",
      nextReady: 'h1:has-text("Grupos")',
    },
    {
      name: "criar",
      prototypeHash: "comunidade",
      prototypeAction: async (page) => {
        await openGroupsTab(page)
        await openGroupCreator(page)
      },
      prototypeReady: "#group-name",
      next: "/groups",
      nextAction: async (page) => {
        await page.getByRole("button", { name: "Criar grupo" }).first().click()
        await page.getByRole("textbox", { name: "Nome do grupo" }).waitFor({ timeout: 15_000 })
      },
      nextReady: 'h1:has-text("Grupos")',
    },
    {
      name: "detalhe",
      prototypeHash: "grupo/g-familias",
      prototypeReady: "#main .detail-title h1",
      next: `/groups/${group.id}`,
      nextReady: "#main h1, main h1, h1",
    },
    {
      name: "gerenciar",
      prototypeHash: "grupo/g-futebol",
      prototypeAction: openGroupManage,
      prototypeReady: "#manage-rules",
      next: `/groups/${group.id}`,
      nextReady: "#main h1, main h1, h1",
    },
  ]
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

const sessionData = await session()
const group = await captureGroup(sessionData)
const next = await ensureNext()
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
)

const SCREENS = screens(group)
const report = {
  task: "COM-003",
  nextUrl,
  candidateUrl,
  account: sessionData.email,
  group: { id: group.id, name: group.name },
  note:
    "As telas de grupo ainda não foram portadas para a pele Material Web: o par " +
    "compara composição, rótulos e textos, não a camada visual (ADR-20261022).",
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

      const nextContext = await createDeterministicContext(browser, { width, theme })
      await nextContext.addCookies(sessionData.cookies)
      const nextPage = await nextContext.newPage()
      nextPage.on("pageerror", (error) =>
        report.pageErrors.push({ side: "next", label, message: error.message }),
      )

      for (const screen of SCREENS) {
        await openPrototypeScreen(prototypePage, candidateUrl, screen)
        const prototypeShots = await capture(
          prototypePage,
          `${width}-${theme}-${screen.name}-prototipo`,
          width,
        )

        await nextPage.goto(`${nextUrl}${screen.next}`)
        await nextPage.locator(screen.nextReady).first().waitFor({ timeout: 20_000 })
        if (screen.nextAction) await screen.nextAction(nextPage)
        const nextShots = await capture(nextPage, `${width}-${theme}-${screen.name}-next`, width)

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
          prototype: { path: screen.prototypeHash, ...pngSize(prototypeShots.full) },
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
