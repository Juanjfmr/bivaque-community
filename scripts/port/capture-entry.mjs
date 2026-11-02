// PORT-005 (lote 4 da entrada) — captura da tela de cidade e das boas-vindas,
// nos três momentos, para a comparação com o protótipo (ADR-20261022).
//
//   node scripts/port/capture-entry.mjs
//
// O que sai em `.visual/port-005/`:
//   cidade-{375,1440}-{light,dark}-{chegando,moro,saindo}.png
//   boas-vindas-{375,1440}-{light,dark}-{chegando,moro,saindo}.png
//   report.json — a URL, as personas, o tamanho de cada PNG e o que foi pulado.
//
// Por que só o lado do Next: a tela de cidade do protótipo só existe depois do
// passo do CPF (`entryNext()` decide entre 'conta', 'cpf', 'cidade'), e dirigi-lo
// até lá exigiria simular a verificação dentro da máquina de estados dele — o
// que a comparação da PORT-001 não precisou fazer. A referência visual desta
// tela são as pranchas da entrada; os PNGs daqui são o lado Next delas, nos
// mesmos tamanhos e temas.
//
// Pessoas:
//   * `verified-no-membership@bivaque.example.invalid` — verificada e sem
//     vínculo, o único estado que abre /onboarding/locality (é a persona do
//     seed que a suíte já usa em two-localities). A tela é capturada nos três
//     momentos, que é só trocar o rádio: nenhum dado é escrito.
//   * a conta do seed visual — membro de Manaus, para as boas-vindas. Os blocos
//     dependem do momento GRAVADO, então o script grava a linha do dono entre as
//     capturas e apaga no fim (o seed não tem essa linha: a captura de "moro
//     aqui" é o estado real do seed, sem escrita nenhuma).
//
// Credenciais e chaves: ambiente primeiro, apps/web/.env.local depois — nunca
// aqui dentro. Sem `SUPABASE_SERVICE_ROLE_KEY`, as capturas de "chegando" e
// "saindo" das boas-vindas são puladas com o motivo no report.json; a de "moro
// aqui" e as três da cidade saem normalmente.

import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { chromium, request } from "@playwright/test"

const root = resolve(import.meta.dirname, "../..")
const output = join(root, ".visual/port-005")
const nextUrl = process.env.BIVAQUE_NEXT_URL ?? "http://127.0.0.1:3000"
const supabaseUrl = process.env.SUPABASE_URL ?? "http://127.0.0.1:55321"

const WIDTHS = [375, 1440]
const THEMES = ["light", "dark"]
const MOMENTS = ["chegando", "moro", "saindo"]

const CITY_PERSONA = "verified-no-membership@bivaque.example.invalid"
const MEMBER_PERSONA = process.env.USER_EMAIL ?? "visual@bivaque.example.invalid"
const BRASILIA_IBGE = "5300108"
const CONSENT_VERSION = "2"

function readEnvLocal(key) {
  try {
    const file = readFileSync(join(root, "apps", "web", ".env.local"), "utf-8")
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

const anonKey =
  process.env.SUPABASE_ANON_KEY ??
  readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
  readEnvLocal("SUPABASE_ANON_KEY")
const password =
  process.env.USER_PASSWORD ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD") ?? "bivaque-e2e-local"
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? readEnvLocal("SUPABASE_SERVICE_ROLE_KEY")

const pngSize = (buffer) => ({
  height: buffer.readUInt32BE(20),
  width: buffer.readUInt32BE(16),
})

async function reachable(url) {
  try {
    const response = await fetch(url, { redirect: "manual" })
    return response.status > 0
  } catch {
    return false
  }
}

function stopServer(child) {
  if (!child) return
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" })
    return
  }
  child.kill()
}

async function ensureNext() {
  if (await reachable(nextUrl)) return null
  if (!existsSync(join(root, "apps/web/.next/BUILD_ID"))) {
    throw new Error(
      "não há build do Next: rode `npx pnpm@11.18.0 --filter web build` antes da captura",
    )
  }
  const port = new URL(nextUrl).port || "3000"
  const child = spawn(
    "npx",
    ["pnpm@11.18.0", "--filter", "web", "start", "--hostname", "127.0.0.1", "--port", port],
    { cwd: root, shell: process.platform === "win32", stdio: "inherit" },
  )
  for (let attempt = 0; attempt < 120; attempt++) {
    if (await reachable(nextUrl)) return child
    await new Promise((done) => setTimeout(done, 1000))
  }
  stopServer(child)
  throw new Error(`o Next não respondeu em ${nextUrl}`)
}

// A sessão entra pelo grant de senha e vira o cookie que o @supabase/ssr lê —
// o mesmo caminho de tests/e2e/helpers/session.ts, sem importar TS no .mjs.
async function signIn(context, email) {
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY ausente (ambiente ou apps/web/.env.local)")
  const api = await request.newContext()
  const response = await api.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    data: { email, password },
    headers: { apikey: anonKey, "Content-Type": "application/json" },
  })
  if (response.status() !== 200) {
    await api.dispose()
    throw new Error(`grant de senha falhou para ${email}: HTTP ${response.status()}`)
  }
  const body = await response.json()
  await api.dispose()

  const claims = JSON.parse(Buffer.from(body.access_token.split(".")[1], "base64").toString("utf8"))
  const session = {
    access_token: body.access_token,
    expires_at: body.expires_at,
    expires_in: body.expires_in,
    refresh_token: body.refresh_token,
    token_type: body.token_type,
    user: { aud: claims.aud, email, id: claims.sub, role: claims.role },
  }
  const base64url = Buffer.from(JSON.stringify(session), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0]
  const shared = {
    domain: "127.0.0.1",
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 400,
    httpOnly: false,
    path: "/",
    sameSite: "Lax",
    secure: false,
  }
  await context.addCookies([
    { name: `sb-${projectRef}-auth-token`, value: `base64-${base64url}`, ...shared },
    { name: "bivaque-consent-version", value: CONSENT_VERSION, ...shared },
  ])
  return { userId: claims.sub }
}

// Escrita do momento pela API REST, como service_role. Só o script de captura
// escreve: o app grava pelo `provision`, e o membro não tem INSERT/UPDATE.
async function writeMoment(userId, moment, destinationIbge) {
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente")
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates",
  }

  let destinationId = null
  if (destinationIbge) {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/localities?select=id&ibge_code=eq.${destinationIbge}`,
      { headers },
    )
    const rows = await response.json()
    destinationId = rows?.[0]?.id ?? null
    if (!destinationId) throw new Error(`cidade ${destinationIbge} fora do catálogo local`)
  }

  const body = {
    arrival_date: moment === "arriving" ? "2030-01-15" : null,
    departure_date: moment === "leaving" ? "2030-03-10" : null,
    destination_locality_id: moment === "leaving" ? destinationId : null,
    moment,
    user_id: userId,
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/member_entry_moments`, {
    body: JSON.stringify(body),
    headers,
    method: "POST",
  })
  if (!response.ok) {
    throw new Error(`não gravou o momento ${moment}: HTTP ${response.status()}`)
  }
}

async function clearMoment(userId) {
  if (!serviceKey) return
  await fetch(`${supabaseUrl}/rest/v1/member_entry_moments?user_id=eq.${userId}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    method: "DELETE",
  })
}

async function waitForPage(page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  })
}

async function capture(page, name) {
  await waitForPage(page)
  const top = await page.screenshot()
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  await page.setViewportSize({ height, width: page.viewportSize().width })
  await waitForPage(page)
  const full = await page.screenshot()
  writeFileSync(join(output, `${name}-topo.png`), top)
  writeFileSync(join(output, `${name}-inteira.png`), full)
  return { full: pngSize(full), top: pngSize(top) }
}

const report = { captured: [], nextUrl, pageErrors: [], skipped: [] }

mkdirSync(output, { recursive: true })
const next = await ensureNext()
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
)

try {
  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      const label = `${width}-${theme}`

      // ── A tela de cidade, nos três momentos ────────────────────────────────
      const cityContext = await browser.newContext({
        colorScheme: theme,
        viewport: { height: 812, width },
      })
      try {
        await signIn(cityContext, CITY_PERSONA)
        const page = await cityContext.newPage()
        page.on("pageerror", (error) => report.pageErrors.push({ label, message: error.message }))
        await page.goto(`${nextUrl}/onboarding/locality`)
        await page.waitForFunction(() => Boolean(customElements.get("md-outlined-text-field")))

        for (const moment of MOMENTS) {
          if (moment !== "chegando") {
            const radio = { moro: "Moro aqui", saindo: "Saindo" }[moment]
            await page.getByRole("radio", { name: radio }).check()
          }
          const name = `cidade-${label}-${moment}`
          report.captured.push({ name, size: await capture(page, name) })
          console.log(`capturado: ${name}`)
        }
      } finally {
        await cityContext.close()
      }

      // ── As boas-vindas, nos três momentos ──────────────────────────────────
      const memberContext = await browser.newContext({
        colorScheme: theme,
        viewport: { height: 812, width },
      })
      let userId = null
      try {
        const session = await signIn(memberContext, MEMBER_PERSONA)
        userId = session.userId
        const page = await memberContext.newPage()
        page.on("pageerror", (error) => report.pageErrors.push({ label, message: error.message }))

        for (const moment of MOMENTS) {
          const name = `boas-vindas-${label}-${moment}`
          if (moment === "moro") {
            // Estado real do seed: sem linha de momento, os blocos caem em "moro aqui".
            await clearMoment(userId)
          } else if (!serviceKey) {
            report.skipped.push({
              reason: "SUPABASE_SERVICE_ROLE_KEY ausente: o momento não pôde ser gravado",
              shot: name,
            })
            continue
          } else {
            await writeMoment(
              userId,
              moment === "chegando" ? "arriving" : "leaving",
              moment === "saindo" ? BRASILIA_IBGE : null,
            )
          }
          await page.goto(`${nextUrl}/onboarding/welcome`)
          await page.waitForFunction(() => Boolean(customElements.get("md-icon")))
          report.captured.push({ name, size: await capture(page, name) })
          console.log(`capturado: ${name}`)
        }
      } finally {
        // O seed não tem linha para esta conta: apagar é restaurar.
        if (userId) await clearMoment(userId)
        await memberContext.close()
      }
    }
  }
} finally {
  await browser.close()
  stopServer(next)
  writeFileSync(join(output, "report.json"), `${JSON.stringify(report, null, 2)}\n`)
}

console.log(`capturas em ${output}`)
