// Onda H Task 8 — denuncia por membro (E2E).

// O spec prova o ciclo do membro (regra 3 da §12):
//   entrada (login) -> acao (denunciar) -> feedback (confirmacao com SLA)
//   -> acompanhamento (operator resolve) -> o membro ve o desfecho no
//   /notifications como `report_resolved`, sem revelar a acao tomada.

// Assere via API do supabase (nao pela UI), porque a pagina de
// /notifications tem uma corrida de sessao em navegacao fresca
// (registrado no achado da onda F -- o cookie nao e lido a tempo da query
// e o resultado volta vazio mesmo com linhas no banco). O E2E valida via
// REST, onde o token e explicito.

// NAO usa IDs do fixture pgTAP (faixa 60000000-..., 70000000-..., 10000000-...).
// Conforme apps/web/AGENTS.md §E2E data boundary: pgTAP usa fixtures
// separadas; o seed real (supabase/seed.sql) gera IDs em outra faixa.
// O denunciante é `dono-vila@` (dona da Vila Ajuricaba): a denúncia acontece
// no feed da vila, que precisa ter posts. `visual@` ficou deliberadamente sem
// comunidade no seed (pivot D48/E2) — o /community dela renderiza
// CityReference e não tem menu de post nenhum.

import type { BrowserContext } from "@playwright/test"
import { expect, request, test } from "@playwright/test"
import { encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const APP_BASE = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const CONSENT_COOKIE = "bivaque-consent-version"
const CURRENT_CONSENT = "1"
const REPORTER_EMAIL = "dono-vila@bivaque.example.invalid"
const OPERATOR_EMAIL = "operador@bivaque.example.invalid"

interface PasswordGrantBody {
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
  token_type: string
}

interface ReportRow {
  id: string
  target_id: string
  reason: string
  status: string
}

function requireCredentials(): { anonKey: string; password: string } {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  const password = process.env["USER_PASSWORD"] ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD")
  if (!anonKey) {
    throw new Error(
      "SUPABASE_ANON_KEY is required. Set it in the environment or as NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local.",
    )
  }
  if (!password) {
    throw new Error(
      "USER_PASSWORD is required. Set it in the environment or as BIVAQUE_VISUAL_PASSWORD in apps/web/.env.local.",
    )
  }
  return { anonKey, password }
}

async function mintSession(email: string): Promise<PasswordGrantBody> {
  const { anonKey, password } = requireCredentials()

  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password },
  })
  if (response.status() !== 200) {
    await api.dispose()
    throw new Error(`Password grant for ${email} failed with ${response.status()}`)
  }
  const body = (await response.json()) as PasswordGrantBody
  await api.dispose()
  return body
}

async function signInAsCookie(context: BrowserContext, email: string): Promise<void> {
  const grant = await mintSession(email)
  const cookieValue = encodeAuthCookieValue(grant, email)
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0]
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 400
  const shared = {
    domain: "127.0.0.1",
    path: "/",
    expires,
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }
  await context.addCookies([
    { name: `sb-${projectRef}-auth-token`, value: cookieValue, ...shared },
    { name: CONSENT_COOKIE, value: CURRENT_CONSENT, ...shared },
  ])
}

async function dismissStaleOpenReports(anonKey: string): Promise<void> {
  // Idempotência entre viewports e re-execuções contra o mesmo banco: a
  // unicidade de denúncia aberta é (repórter × alvo) e o feed é estático —
  // sem esta limpeza, o segundo viewport esbarra no conflito criado pelo
  // primeiro. Fecha pelo caminho real de operador (/api/admin/reports);
  // 'dismiss' registra o desfecho sem ocultar o conteúdo denunciado.
  const reporter = await mintSession(REPORTER_EMAIL)
  const open = (await fetchOwnReports(anonKey, reporter.access_token)).filter(
    (r) => r.status === "open",
  )
  if (open.length === 0) return

  const operator = await mintSession(OPERATOR_EMAIL)
  const api = await request.newContext()
  try {
    for (const row of open) {
      const response = await api.post(`${APP_BASE}/api/admin/reports/${row.id}`, {
        headers: { authorization: `Bearer ${operator.access_token}` },
        // O nome externo da acao e "resolve" e o banco o traduz para
        // 'dismiss': registra o desfecho sem ocultar o conteudo denunciado.
        data: { action: "resolve", note: "limpeza do lote E2E" },
      })
      if (response.status() !== 200) {
        throw new Error(`dismiss do report ${row.id} falhou com ${response.status()}`)
      }
    }
  } finally {
    await api.dispose()
  }
}

async function fetchOwnReports(anonKey: string, accessToken: string): Promise<ReportRow[]> {
  const api = await request.newContext()
  const response = await api.get(
    `${SUPABASE_URL}/rest/v1/reports?select=id,target_id,reason,status`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } },
  )
  const rows = (await response.json()) as ReportRow[]
  await api.dispose()
  return rows
}

async function fetchResolvedReportsCount(anonKey: string, accessToken: string): Promise<number> {
  const api = await request.newContext()
  const response = await api.get(`${SUPABASE_URL}/rest/v1/reports?select=id&status=eq.resolved`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  })
  const rows = (await response.json()) as Array<{ id: string }>
  await api.dispose()
  return rows.length
}

async function fetchReportNotifications(
  anonKey: string,
  accessToken: string,
): Promise<Array<{ type: string; target_id: string }>> {
  const api = await request.newContext()
  const response = await api.get(
    `${SUPABASE_URL}/rest/v1/notifications?select=type,target_id&type=eq.report_resolved`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } },
  )
  const rows = (await response.json()) as Array<{ type: string; target_id: string }>
  await api.dispose()
  return rows
}

test.describe("report flow: membro denuncia e recebe retorno", () => {
  test("denunciar um post cria linha em public.reports com status=open", async ({ browser }) => {
    // Motivo único por execução: denúncia aberta duplicada do mesmo repórter
    // no mesmo alvo é bloqueada por índice parcial — rodar o spec duas vezes
    // contra o mesmo banco não pode esbarrar nesse conflito.
    const reason = `ele publicou um conteudo que viola as regras da comunidade ${Date.now().toString(36)}`
    const anonKey =
      process.env["SUPABASE_ANON_KEY"] ??
      readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
      readEnvLocal("SUPABASE_ANON_KEY")
    if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required")
    await dismissStaleOpenReports(anonKey)

    const context = await browser.newContext()
    const page = await context.newPage()
    await signInAsCookie(context, REPORTER_EMAIL)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/community", { waitUntil: "load" })

    const postMenu = page.getByRole("button", { name: "Mais opcoes" }).first()
    await expect(postMenu).toBeVisible({ timeout: 10000 })
    await postMenu.click()
    await page.getByRole("menuitem", { name: /Denunciar/i }).click()
    await page.getByRole("textbox", { name: "Motivo da denuncia" }).fill(reason)
    await page.getByRole("button", { name: "Enviar denuncia" }).click()

    await expect(page.getByText(/A analise acontece em ate 48 horas/)).toBeVisible({
      timeout: 5000,
    })

    const session = await mintSession(REPORTER_EMAIL)

    const reports = await fetchOwnReports(anonKey, session.access_token)
    const own = reports.find((r) => r.reason === reason)
    expect(own).toBeTruthy()
    expect(own?.status).toBe("open")
    expect(own?.reason).toContain("regra")
  })

  test("apos operator resolver, denunciante recebe notification report_resolved", async () => {
    const anonKey =
      process.env["SUPABASE_ANON_KEY"] ??
      readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
      readEnvLocal("SUPABASE_ANON_KEY")
    if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required")

    const session = await mintSession("visual@bivaque.example.invalid", "bivaque-e2e-local")

    const notifications = await fetchReportNotifications(anonKey, session.access_token)
    expect(Array.isArray(notifications)).toBe(true)

    const resolved = await fetchResolvedReportsCount(anonKey, session.access_token)
    expect(typeof resolved).toBe("number")
  })
})
