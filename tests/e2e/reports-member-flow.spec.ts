// Onda H Task 8 — denuncia por membro (E2E).
//
// Este spec e stateful: cria uma denuncia, resolve a mesma linha pelo caminho
// real de operador e confirma a notificacao com o token do denunciante. A CI
// o executa uma vez, no desktop, imediatamente depois de db reset com seed.

import type { BrowserContext } from "@playwright/test"
import { expect, request, test } from "@playwright/test"
import { encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const APP_BASE = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const CONSENT_COOKIE = "bivaque-consent-version"
const CURRENT_CONSENT = "1"
const REPORTER_EMAIL = "dono-vila@bivaque.example.invalid"
const OPERATOR_EMAIL = "operador@bivaque.example.invalid"
const TARGET_POST_TEXT =
  "A feira do fim de semana abriu mais cedo e estava tranquila na primeira hora."

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
  try {
    const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      data: { email, password },
    })
    if (response.status() !== 200) {
      throw new Error(`Password grant for ${email} failed with ${response.status()}`)
    }
    return (await response.json()) as PasswordGrantBody
  } finally {
    await api.dispose()
  }
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

async function fetchOwnReportByReason(
  anonKey: string,
  accessToken: string,
  reason: string,
): Promise<ReportRow[]> {
  const query = new URLSearchParams({
    select: "id,target_id,reason,status",
    reason: `eq.${reason}`,
  })
  const api = await request.newContext()
  try {
    const response = await api.get(`${SUPABASE_URL}/rest/v1/reports?${query.toString()}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok()) {
      throw new Error(`Own reports query failed with ${response.status()}`)
    }
    return (await response.json()) as ReportRow[]
  } finally {
    await api.dispose()
  }
}

async function resolveReport(reportId: string): Promise<void> {
  const operator = await mintSession(OPERATOR_EMAIL)
  const api = await request.newContext()
  try {
    const response = await api.post(`${APP_BASE}/api/admin/reports/${reportId}`, {
      headers: { authorization: `Bearer ${operator.access_token}` },
      data: { action: "resolve", note: "ciclo E2E stateful" },
    })
    if (response.status() !== 200) {
      throw new Error(`Resolve report ${reportId} failed with ${response.status()}`)
    }
  } finally {
    await api.dispose()
  }
}

async function fetchReportNotifications(
  anonKey: string,
  accessToken: string,
  reportId: string,
): Promise<Array<{ type: string; target_id: string }>> {
  const query = new URLSearchParams({
    select: "type,target_id",
    type: "eq.report_resolved",
    target_id: `eq.${reportId}`,
  })
  const api = await request.newContext()
  try {
    const response = await api.get(
      `${SUPABASE_URL}/rest/v1/notifications?${query.toString()}`,
      { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } },
    )
    if (!response.ok()) {
      throw new Error(`Report notifications query failed with ${response.status()}`)
    }
    return (await response.json()) as Array<{ type: string; target_id: string }>
  } finally {
    await api.dispose()
  }
}

test.describe(
  "report flow: membro denuncia e recebe retorno",
  { tag: "@stateful" },
  () => {
    test("membro denuncia, operador resolve e notificacao referencia a denuncia", async ({
      browser,
    }) => {
      const reason = `conteudo fora das regras da comunidade ${Date.now().toString(36)}`
      const { anonKey } = requireCredentials()
      const reporter = await mintSession(REPORTER_EMAIL)
      const context = await browser.newContext()

      try {
        const page = await context.newPage()
        await signInAsCookie(context, REPORTER_EMAIL)
        await page.goto("/community", { waitUntil: "load" })
        await expect(page).toHaveURL(/\/community$/)

        // O post municipal fixo pertence ao proprio dono-vila e nao pode ser
        // denunciado por ele. Este texto vem dos posts gerados por outros
        // membros e reduz o locator ao artigo correto antes de abrir o menu.
        const post = page.getByRole("article").filter({ hasText: TARGET_POST_TEXT }).first()
        await expect(post).toBeVisible({ timeout: 10000 })
        await post.getByRole("button", { name: "Mais opcoes" }).click()
        await page.getByRole("menuitem", { name: /Denunciar/i }).click()
        await page.getByRole("textbox", { name: "Motivo da denuncia" }).fill(reason)
        await page.getByRole("button", { name: "Enviar denuncia" }).click()

        await expect(page.getByText(/A analise acontece em ate 48 horas/)).toBeVisible({
          timeout: 5000,
        })

        const created = await fetchOwnReportByReason(anonKey, reporter.access_token, reason)
        expect(created).toHaveLength(1)
        const report = created[0]
        expect(report).toBeDefined()
        if (!report) throw new Error("Created report was not returned to its reporter")
        expect(report.status).toBe("open")
        expect(report.reason).toBe(reason)

        await resolveReport(report.id)

        const resolved = await fetchOwnReportByReason(anonKey, reporter.access_token, reason)
        expect(resolved).toHaveLength(1)
        expect(resolved[0]?.status).toBe("resolved")

        const notifications = await fetchReportNotifications(
          anonKey,
          reporter.access_token,
          report.id,
        )
        expect(notifications).toEqual([{ type: "report_resolved", target_id: report.id }])
      } finally {
        await context.close()
      }
    })
  },
)
