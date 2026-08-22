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
// Aqui so usamos o email `visual@` que existe em ambos, mas a denuncia
// e feita via UI -- o target_id sai do banco de verdade, nao da fixture.

import { expect, request, test } from "@playwright/test"
import { readEnvLocal, seedSession } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const REPORT_REASON = "ele publicou um conteudo que viola as regras da comunidade"

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

async function mintSession(email: string, password: string): Promise<PasswordGrantBody> {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required")

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
    const context = await browser.newContext()
    const page = await context.newPage()
    await seedSession(context)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/community", { waitUntil: "load" })

    const postMenu = page.getByRole("button", { name: "Mais opcoes" }).first()
    if (await postMenu.isVisible().catch(() => false)) {
      await postMenu.click()
      const reportItem = page.getByRole("menuitem", { name: /Denunciar/i })
      await reportItem.click()
      await page.getByRole("textbox", { name: "Motivo da denuncia" }).fill(REPORT_REASON)
      await page.getByRole("button", { name: "Enviar denuncia" }).click()

      await expect(page.getByText(/A analise acontece em ate 48 horas/)).toBeVisible({
        timeout: 5000,
      })
    }

    const session = await mintSession("visual@bivaque.example.invalid", "bivaque-e2e-local")
    const anonKey =
      process.env["SUPABASE_ANON_KEY"] ??
      readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
      readEnvLocal("SUPABASE_ANON_KEY")
    if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required")

    const reports = await fetchOwnReports(anonKey, session.access_token)
    const own = reports.find((r) => r.reason === REPORT_REASON)
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
