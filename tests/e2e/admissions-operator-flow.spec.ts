// Onda H Task 6 — decisao de admissao pelo operator (E2E).
//
// O spec prova o ciclo do operator na fila de admissoes (H-Task 6):
//   entrada (login operador) -> observacao (o painel /admissions renderiza fila
//   + documentos pelo caminho real: server component com cliente service_role
//   e gate proprio de operador).
//
// Reconciliacao 2026-08-23 (drift do MVP-01-ADMISSION): as migrations
// 20260809171022 e 20260815132000 definem o contrato das RPCs
// list_verification_queue/list_verification_documents como service_role-only
// (`revoke all ... from authenticated` + `grant execute ... to service_role`).
// Os testes que antes esperavam SUCESSO chamando as RPCs via REST com o JWT do
// operador contradiziam esse contrato e foram reescritos como testes negativos
// de autorizacao: a negacao (403 / 42501) e o comportamento correto na borda
// HTTP. A forma dos dados da fila e dos documentos segue provada em pgTAP
// (supabase/tests/verification-documents.sql, admissions-decision.sql).
//
// NAO usa IDs do fixture pgTAP. O seed tem:
//   - 90000000-...: usuarios na fila de admissao (pending/temporary_error/rejected)

import { expect, request, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

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

async function anonKey(): Promise<string> {
  const key =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  if (!key) throw new Error("SUPABASE_ANON_KEY is required")
  return key
}

async function mintOperatorSession(): Promise<PasswordGrantBody> {
  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: await anonKey(), "Content-Type": "application/json" },
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
  const body = await mintOperatorSession()

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
    { name: "bivaque-consent-version", value: CURRENT_CONSENT, ...shared },
  ])
}

// Chamada REST direta da RPC com o JWT do operador — o caminho que o contrato
// proibe. Devolve status e corpo para os testes negativos afirmarem a negacao.
async function callRpcAsOperator(fn: string): Promise<{ status: number; body: unknown }> {
  const session = await mintOperatorSession()
  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    headers: {
      apikey: await anonKey(),
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    data: {},
  })
  const text = await response.text()
  await api.dispose()
  let body: unknown
  try {
    body = JSON.parse(text) as unknown
  } catch {
    body = text
  }
  return { status: response.status(), body }
}

test.describe("admission flow: operator decide via painel", () => {
  test("painel /admissions renderiza fila + documentos", async ({ page }) => {
    // Given um operador autenticado
    await signInOperator(page)
    await page.setViewportSize({ width: 1280, height: 800 })

    // When ele abre o painel de admissoes (grupo (admin) nao aparece na URL)
    await page.goto("/admissions", { waitUntil: "load" })

    // Then o titulo esta visivel
    await expect(page.getByRole("heading", { name: "Fila de admissao" })).toBeVisible({
      timeout: 5000,
    })

    // And os dois conjuntos (documentos + fila) estao presentes
    await expect(page.getByRole("heading", { name: /Documentos aguardando/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /Fila de verificacao/i })).toBeVisible()
  })

  test("list_verification_queue nega REST direta do operador (contrato service_role)", async () => {
    // Given o operador autenticado
    // When ele chama a RPC diretamente pela API com o proprio JWT
    const { status, body } = await callRpcAsOperator("list_verification_queue")

    // Then a negacao e a resposta correta: permission denied, sem nenhuma linha
    expect(status).toBe(403)
    expect((body as { code?: string }).code).toBe("42501")
    expect(Array.isArray(body)).toBe(false)
  })

  test("list_verification_documents nega REST direta do operador (contrato service_role)", async () => {
    // Given o operador autenticado
    // When ele chama a RPC diretamente pela API com o proprio JWT
    const { status, body } = await callRpcAsOperator("list_verification_documents")

    // Then a negacao e a resposta correta: permission denied, sem nenhuma linha
    expect(status).toBe(403)
    expect((body as { code?: string }).code).toBe("42501")
    expect(Array.isArray(body)).toBe(false)
  })
})
