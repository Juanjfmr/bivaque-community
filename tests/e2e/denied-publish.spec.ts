// E2E denied-publish: prova negativa do caminho "denied" do compositor.
//
// ADR-20260901-account-suspension (aprovado em 2026-09-01, commit 7532aea):
// uma tabela profile_suspensions + helper public.is_account_suspended()
// + RLS update em posts/comments/post_reactions/reports. INSERT em posts
// retorna 42501 quando o caller esta suspenso; o cliente
// classifica como 'server' em lib/composer/publish-error.ts e exibe copy
// generica identica a qualquer outra negacao (anti-enumeracao §4.3).
//
// Persona: dono-vila@bivaque.example.invalid (dona da Vila Ajuricaba, ja
// semeada em supabase/seed.sql, UUID 20000000-...-008). Nao existe persona
// dedicada de suspensao: o teste alterna is_suspended=false -> true via
// service_role antes do cenario e restaura no cleanup. O seed ja teve uma
// persona membro-suspenso@, mas ela saiu — a fixture vivia numa migration
// (que iria a producao) e nenhum teste a consumia.
//
// Cenarios cobertos:
//   - caminho try/catch do submit: POST /rest/v1/posts retorna 42501
//     (RLS com is_account_suspended()), UI mostra FeedbackAlert danger
//     com copy generica, post NAO chega ao DB, rascunho preservado.
//   - copy da UI nao distingue "suspenso" de "outras razoes" — so
//     mostra "Nao foi possivel criar a publicacao", que e o mesmo
//     texto de falha de transporte (DS-016).
//
// Determinístico: serial-safe (workers=1 no playwright.config), texto
// unico por timestamp impede colisao com execucoes anteriores.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { BrowserContext } from "@playwright/test"
import { expect, request, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"

// Reusamos dono-vila@ (ja validada em publish-golden-slice) e alternamos
// suspensa antes do teste / reabilitada no cleanup. Isso evita a
// complexidade de seedar uma persona suspensa que precisa navegar o
// proxy.ts sem cair em /onboarding (proxy.ts: kind===null).
const VILA_OWNER_EMAIL = "dono-vila@bivaque.example.invalid"
const VILA_OWNER_USER_ID = "20000000-0000-4000-8000-000000000008"

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

function requireCredentials(): { anonKey: string; password: string; serviceRoleKey: string } {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  const password = process.env["USER_PASSWORD"] ?? "bivaque-e2e-local"
  const serviceRoleKey =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? readEnvLocal("SUPABASE_SERVICE_ROLE_KEY")
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required")
  if (!password) throw new Error("USER_PASSWORD is required")
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required (to toggle the suspension row from outside RLS). " +
        "Set it in env or apps/web/.env.local.",
    )
  }
  return { anonKey, password, serviceRoleKey }
}

interface PasswordGrant {
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
  token_type: string
}

async function seedVilaOwnerSession(context: BrowserContext): Promise<void> {
  const { anonKey, password } = requireCredentials()
  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email: VILA_OWNER_EMAIL, password },
  })
  if (response.status() !== 200) {
    await api.dispose()
    throw new Error(`Password grant for ${VILA_OWNER_EMAIL} failed: ${response.status()}`)
  }
  const grant = (await response.json()) as PasswordGrant
  await api.dispose()
  const cookieValue = encodeAuthCookieValue(grant, VILA_OWNER_EMAIL)
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0]
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 400
  await context.addCookies([
    {
      name: `sb-${projectRef}-auth-token`,
      value: cookieValue,
      domain: "127.0.0.1",
      path: "/",
      expires,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
    {
      name: CONSENT_COOKIE,
      value: CURRENT_CONSENT,
      domain: "127.0.0.1",
      path: "/",
      expires,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ])
}

// Toggle suspensao via service_role: insere/remove a linha em
// public.profile_suspensions (ADR-20260910). So service_role escreve essa
// tabela; a policy de UPDATE de profiles nao permite self-suspend. Cleanup
// garante que a persona volta ao estado normal apos o teste, mesmo em falha,
// porque workers=1 torna o estado compartilhado entre specs.
async function setSuspended(serviceRoleKey: string, suspended: boolean): Promise<void> {
  const api = await request.newContext()
  try {
    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    }
    // Linha presente em profile_suspensions = conta suspensa (ADR-20260910).
    const response = suspended
      ? await api.post(`${SUPABASE_URL}/rest/v1/profile_suspensions`, {
          headers,
          data: { user_id: VILA_OWNER_USER_ID },
        })
      : await api.delete(
          `${SUPABASE_URL}/rest/v1/profile_suspensions?user_id=eq.${VILA_OWNER_USER_ID}`,
          { headers },
        )
    if (!response.ok()) {
      throw new Error(
        `setSuspended(${suspended}) failed: ${response.status()} ${await response.text()}`,
      )
    }
  } finally {
    await api.dispose()
  }
}

test.describe("denied publish: conta suspensa veta INSERT em posts (W1-DENIED)", () => {
  test("compositor bloqueia o insert com copy generica; post nao chega ao DB", async ({
    browser,
  }) => {
    const { serviceRoleKey } = requireCredentials()
    const contentPrefix = `GS-DENIED ${Date.now().toString(36)}`

    await setSuspended(serviceRoleKey, true)

    try {
      const context = await browser.newContext()
      const page = await context.newPage()
      await seedVilaOwnerSession(context)
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto("/inicio", { waitUntil: "load" })

      // Persona eh a dona da Vila Ajuricaba (mesma do publish-golden-slice).
      // Como ela esta suspensa, o RLS veto no POST /rest/v1/posts
      // (policy posts_insert_locality_member tem AND NOT is_account_suspended(auth.uid())).
      const ask = page.getByTestId("intent-pergunta")
      await expect(ask).toBeVisible({ timeout: 15000 })
      await ask.click()
      await page.getByRole("heading", { name: "Criar publicação" }).waitFor({ timeout: 10000 })

      await page.getByLabel("Pergunta").fill(`${contentPrefix} membro suspenso tentou publicar`)
      await page.getByTestId("publish-submit").click()

      // Copy generica: lib/composer/publish-error.ts classifica 42501 como
      // 'server' e exibe exatamente o mesmo texto de qualquer outra falha.
      // Anti-enumeracao §4.3: indistinguishable de "sem permissao" / "nao existe".
      await expect(page.getByText(/Não foi possível criar a publicação/)).toBeVisible({
        timeout: 10000,
      })

      const alert = page.locator('[role="alert"]').first()
      await expect(alert).toBeVisible({ timeout: 5000 })

      // Modal continua aberto com o rascunho preservado (botao Cancelar e
      // Publicar seguem visiveis) — o membro nao perdeu o que escreveu.
      await expect(page.getByTestId("publish-submit")).toBeVisible()

      // Prova negativa via DB: query com a service_role (bypassa RLS)
      // confirma que NENHUM post com o prefixo unico do run chegou.
      // Sem service_role, a query com a sessao do proprio membro tambem
      // retornaria [] — mas a prova eh mais limpa via service_role porque
      // nao depende da RLS de leitura de posts.
      const api = await request.newContext()
      try {
        const check = await api.get(
          `${SUPABASE_URL}/rest/v1/posts?select=id&user_id=eq.${VILA_OWNER_USER_ID}&content=like.*${encodeURIComponent(contentPrefix)}*`,
          { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
        )
        if (!check.ok()) {
          throw new Error(`DB check failed: ${check.status()} ${await check.text()}`)
        }
        const rows = (await check.json()) as unknown[]
        expect(rows.length).toBe(0)
      } finally {
        await api.dispose()
      }
    } finally {
      // Cleanup sempre: devolve a persona ao estado nao-suspenso para nao
      // contaminar specs subsequentes (workers=1 + serial). Captura erro
      // de cleanup mas nao mascara erro do teste.
      try {
        await setSuspended(serviceRoleKey, false)
      } catch {
        // best-effort
      }
    }
  })
})
