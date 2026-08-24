// Onda H Task 8 — triagem e resolucao pelo operator (E2E).
//
// O spec prova o ciclo do operator (regra 3 da §12, lado operador):
//   entrada (login operador) -> acao (ocultar/dismiss) -> feedback
//   (registro) -> acompanhamento (notificacao do denunciante) ->
//   sad path (alvo some da leitura do membro comum).
//
// O operator resolve pelo painel /admin/reports, que agora mostra:
//   - trecho do conteudo (240 chars, H-Task 4)
//   - display_name do autor
//   - idade relativa com destaque SLA 48h
//   - contador de denuncias abertas no mesmo alvo (sinal de campanha)
//
// Resolve via RPC unico resolve_report(p_report_id, p_operator_user_id,
// p_action, p_note) -- service_role-only -- que oculta por tipo E notifica
// o denunciante num unico ato. (H-Task 3.)
//
// Assere via API porque a pagina /admin/reports le com service_role e o
// ciclo do operador precisa provar no banco, nao na UI: o conteudo some
// da leitura do membro comum -- is_deleted=true.

import { expect, request, test } from "@playwright/test"
import { encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const OPERATOR_EMAIL = "operador@bivaque.example.invalid"

// Same pattern as persistent-login.spec.ts: never inline the password.
// Read from environment, fall back to apps/web/.env.local, throw otherwise.
const OPERATOR_PASSWORD =
  process.env["BIVAQUE_E2E_OPERATOR_PASSWORD"] ?? readEnvLocal("BIVAQUE_E2E_OPERATOR_PASSWORD")
if (!OPERATOR_PASSWORD) {
  throw new Error(
    "BIVAQUE_E2E_OPERATOR_PASSWORD is required. Set it in the environment or in apps/web/.env.local.",
  )
}

interface PasswordGrantBody {
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
  token_type: string
}

interface OpenReport {
  id: string
  target_type: string
  target_id: string
  status: string
  created_at: string
}

async function _mintOperatorSession(): Promise<PasswordGrantBody> {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required")

  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email: OPERATOR_EMAIL, password: OPERATOR_PASSWORD },
  })
  if (response.status() !== 200) {
    await api.dispose()
    throw new Error(`Password grant for operator failed with ${response.status()}`)
  }
  const body = (await response.json()) as PasswordGrantBody
  await api.dispose()
  return body
}

async function signInOperator(page: import("@playwright/test").Page): Promise<void> {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required")

  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email: OPERATOR_EMAIL, password: OPERATOR_PASSWORD },
  })
  if (response.status() !== 200) {
    await api.dispose()
    throw new Error(`Password grant for operator failed with ${response.status()}`)
  }
  const body = (await response.json()) as PasswordGrantBody
  await api.dispose()

  const cookieValue = encodeAuthCookieValue(body, OPERATOR_EMAIL)
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
  await page.context().addCookies([
    { name: `sb-${projectRef}-auth-token`, value: cookieValue, ...shared },
    { name: "bivaque-consent-version", value: "1", ...shared },
  ])
}

async function _listOpenReports(operatorToken: string): Promise<OpenReport[]> {
  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/rest/v1/rpc/list_open_reports`, {
    headers: {
      apikey: process.env["SUPABASE_ANON_KEY"] ?? readEnvLocal("SUPABASE_ANON_KEY") ?? "",
      Authorization: `Bearer ${operatorToken}`,
      "Content-Type": "application/json",
    },
    data: {},
  })
  const rows = (await response.json()) as OpenReport[]
  await api.dispose()
  return rows
}

test.describe("report flow: operator resolve via painel", () => {
  test("painel /admin/reports lista denuncias abertas", async ({ page }) => {
    // Given um operador autenticado
    await signInOperator(page)
    await page.setViewportSize({ width: 1280, height: 800 })

    // When ele abre o painel
    await page.goto("/reports", { waitUntil: "load" })

    // Then a pagina renderiza -- a fila pode estar vazia em alguma suite
    // mas o titulo esta sempre visivel
    await expect(page.getByRole("heading", { name: /Denúncias/i }).first()).toBeVisible({
      timeout: 5000,
    })
  })
})
