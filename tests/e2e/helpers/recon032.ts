// RECON-032 — mint de sessão por conta do seed e consultas REST com o token
// do próprio membro. Mesma técnica do reports-member-flow.spec.ts (password
// grant + cookie codificado pelo helpers/session, que é o formato que o
// @supabase/ssr lê); o que muda é poder escolher a conta.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { type BrowserContext, request } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue } from "./session"

export const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
export const APP_BASE =
  process.env["APP_URL"] ?? process.env["PLAYWRIGHT_TEST_BASE_URL"] ?? "http://127.0.0.1:3000"

const CONSENT_COOKIE = "bivaque-consent-version"

interface PasswordGrant {
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
  token_type: string
  user: { id: string }
}

function readEnvLocal(key: string): string | undefined {
  try {
    const file = readFileSync(join(process.cwd(), "apps", "web", ".env.local"), "utf-8")
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

function seedPassword(): string {
  const password =
    process.env["USER_PASSWORD"] ??
    readEnvLocal("BIVAQUE_VISUAL_PASSWORD") ??
    readEnvLocal("USER_PASSWORD")
  if (!password) {
    throw new Error("USER_PASSWORD ausente: defina BIVAQUE_VISUAL_PASSWORD em apps/web/.env.local")
  }
  return password
}

function anonKey(): string {
  const key =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  if (!key) {
    throw new Error("SUPABASE_ANON_KEY ausente em apps/web/.env.local")
  }
  return key
}

export interface Session {
  accessToken: string
  id: string
}

async function grantFor(email: string): Promise<PasswordGrant> {
  const api = await request.newContext()
  try {
    const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: anonKey(), "Content-Type": "application/json" },
      data: { email, password: seedPassword() },
    })
    if (response.status() !== 200) {
      throw new Error(`password grant falhou para ${email}: ${response.status()}`)
    }
    return (await response.json()) as PasswordGrant
  } finally {
    await api.dispose()
  }
}

export async function mintSession(email: string): Promise<Session> {
  const grant = await grantFor(email)
  return { accessToken: grant.access_token, id: grant.user.id }
}

// Instala sessão + consentimento no contexto e devolve o token de acesso para
// as consultas REST que preparam ou conferem estado.
export async function seedAs(context: BrowserContext, email: string): Promise<Session> {
  const grant = await grantFor(email)
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
  return { accessToken: grant.access_token, id: grant.user.id }
}

// O corpo é lido antes do dispose: devolver a Response para o chamador ler
// depois estourava "Response has been disposed" e o assert virava falso
// negativo de fluxo.
async function fetchAs(
  url: string,
  accessToken: string,
  init: { method?: string; headers?: Record<string, string>; data?: unknown } = {},
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const api = await request.newContext()
  try {
    const response = await api.fetch(url, {
      ...init,
      headers: {
        apikey: anonKey(),
        Authorization: `Bearer ${accessToken}`,
        ...(init.headers ?? {}),
      },
    })
    const status = response.status()
    const ok = response.ok()
    let body: unknown = null
    if (ok) {
      try {
        body = await response.json()
      } catch {
        body = null
      }
    }
    return { ok, status, body }
  } finally {
    await api.dispose()
  }
}

export async function restSelect<T>(
  table: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  const query = new URLSearchParams({ select: "*", ...params })
  const result = await fetchAs(`${SUPABASE_URL}/rest/v1/${table}?${query.toString()}`, accessToken)
  if (!result.ok) {
    throw new Error(`REST select em ${table} falhou: ${result.status}`)
  }
  return (result.body ?? []) as T[]
}

export async function restInsert<T>(
  table: string,
  accessToken: string,
  data: unknown,
): Promise<T | null> {
  const result = await fetchAs(`${SUPABASE_URL}/rest/v1/${table}`, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    data,
  })
  if (!result.ok) {
    throw new Error(`REST insert em ${table} falhou: ${result.status}`)
  }
  const rows = (result.body ?? []) as T[]
  return rows[0] ?? null
}

export async function restDelete(
  table: string,
  accessToken: string,
  params: Record<string, string>,
): Promise<boolean> {
  const query = new URLSearchParams(params)
  const result = await fetchAs(
    `${SUPABASE_URL}/rest/v1/${table}?${query.toString()}`,
    accessToken,
    { method: "DELETE" },
  )
  return result.ok
}

export async function restRpc<T>(
  fn: string,
  accessToken: string,
  body: unknown,
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const result = await fetchAs(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: body,
  })
  return {
    ok: result.ok,
    status: result.status,
    data: result.ok ? (result.body as T) : null,
  }
}

export async function resolveReportAsOperator(reportId: string, operator: Session): Promise<void> {
  const api = await request.newContext()
  try {
    const response = await api.post(`${APP_BASE}/api/admin/reports/${reportId}`, {
      headers: { authorization: `Bearer ${operator.accessToken}` },
      data: { action: "resolve", note: "ciclo E2E RECON-032" },
    })
    if (response.status() !== 200) {
      throw new Error(`resolve da denúncia ${reportId} falhou: ${response.status()}`)
    }
  } finally {
    await api.dispose()
  }
}
