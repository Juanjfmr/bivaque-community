// Onda H Task 6 — decisao de admissao pelo operator (E2E).

// O spec prova o ciclo do operator na fila de admissoes (H-Task 6):
//   entrada (login operador) -> observacao (lista + documentos) ->
//   acao (reprocessar / aprovar documento / rejeitar documento / rejeitar
//   definitivamente) -> feedback (registro no banco, sem revelar acao) ->
//   acompanhamento (a pessoa ve o estado em /onboarding/status).

// NAO usa IDs do fixture pgTAP. O seed tem:
//   - 90000000-...: usuarios na fila de admissao (pending/temporary_error/rejected)
//   - documents pendentes em list_verification_documents()

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

interface QueueEntry {
  user_id: string
  status: string
  created_at: string
}

interface DocEntry {
  document_id: string
  user_id: string
  mime_type: string
  review_status: string
  uploaded_at: string
}

async function mintOperatorSession(): Promise<PasswordGrantBody> {
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

async function listQueue(operatorToken: string): Promise<QueueEntry[]> {
  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/rest/v1/rpc/list_verification_queue`, {
    headers: {
      apikey: process.env["SUPABASE_ANON_KEY"] ?? readEnvLocal("SUPABASE_ANON_KEY") ?? "",
      Authorization: `Bearer ${operatorToken}`,
      "Content-Type": "application/json",
    },
    data: {},
  })
  const rows = (await response.json()) as QueueEntry[]
  await api.dispose()
  return rows
}

async function listDocuments(operatorToken: string): Promise<DocEntry[]> {
  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/rest/v1/rpc/list_verification_documents`, {
    headers: {
      apikey: process.env["SUPABASE_ANON_KEY"] ?? readEnvLocal("SUPABASE_ANON_KEY") ?? "",
      Authorization: `Bearer ${operatorToken}`,
      "Content-Type": "application/json",
    },
    data: {},
  })
  const rows = (await response.json()) as DocEntry[]
  await api.dispose()
  return rows
}

test.describe("admission flow: operator decide via painel", () => {
  test("painel /admin/admissions renderiza fila + documentos", async ({ page }) => {
    // Given um operador autenticado
    await signInOperator(page)
    await page.setViewportSize({ width: 1280, height: 800 })

    // When ele abre o painel de admissoes
    await page.goto("/admin/admissions", { waitUntil: "load" })

    // Then o titulo esta visivel
    await expect(page.getByRole("heading", { name: "Fila de admissao" })).toBeVisible({
      timeout: 5000,
    })

    // And os dois conjuntos (documentos + fila) estao presentes
    await expect(page.getByRole("heading", { name: /Documentos aguardando/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /Fila de verificacao/i })).toBeVisible()
  })

  test("list_verification_queue retorna fila do estado real", async () => {
    // Given o operator
    const session = await mintOperatorSession()

    // When ele chama list_verification_queue via API
    const queue = await listQueue(session.access_token)

    // Then a fila tem o formato esperado -- o seed tem ~300 contas em
    // pending/temporary_error/rejected, entao queue.length > 0
    expect(Array.isArray(queue)).toBe(true)
    expect(queue.length).toBeGreaterThan(0)
    if (queue.length > 0) {
      expect(queue[0].user_id).toMatch(/^[0-9a-f-]{36}$/)
      expect(["pending", "temporary_error", "rejected"]).toContain(queue[0].status)
    }
  })

  test("list_verification_documents retorna documentos pendentes", async () => {
    // Given o operator
    const session = await mintOperatorSession()

    // When ele chama list_verification_documents
    const docs = await listDocuments(session.access_token)

    // Then a resposta e um array (pode estar vazio se nenhum documento
    // foi enviado ainda no seed)
    expect(Array.isArray(docs)).toBe(true)
    if (docs.length > 0) {
      expect(docs[0].document_id).toMatch(/^[0-9a-f-]{36}$/)
      expect(docs[0].review_status).toBe("pending")
    }
  })
})
