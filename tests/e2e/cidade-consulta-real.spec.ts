import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue } from "./helpers/session"

// CIDADE-169 — a consulta de cidade no app, contra o seed real.
//
// A regra de leitura é do dono (ADR-20260925-consulta-outra-cidade) e está
// provada no banco (supabase/tests/consulta-outra-cidade.sql). Aqui se prova o
// RUNTIME: a pessoa abre a consulta da própria cidade e de outra pelo chip, e
// as linhas abrem os detalhes de sempre — inclusive para quem é de fora, que vê
// a referência sem os botões que o banco recusaria.
//
// Manaus tem UUID durável (20260802000100) e é onde o seed põe Guia, encontros
// e anúncios; o Rio nasce por ibge_code e é a cidade de `membro-vazia`. Por
// isso "em visita" é a Rio consultando Manaus, e não o contrário.
//
// `import.meta.dirname` não vale aqui: o Playwright transpila specs para CJS.

const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
const MANAUS = "00000000-0000-4000-8000-000000000001"

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

function requireCredentials(): { anonKey: string; password: string } {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  const password = process.env["USER_PASSWORD"] ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD")
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required")
  if (!password) throw new Error("USER_PASSWORD is required")
  return { anonKey, password }
}

async function signInAs(page: Page, email: string): Promise<void> {
  const { anonKey, password } = requireCredentials()
  const response = await page
    .context()
    .request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      data: { email, password },
    })
  if (response.status() !== 200) {
    throw new Error(
      `Password grant for ${email} failed with ${response.status()}. A pilha local está no ar e semeada?`,
    )
  }
  const body = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_at: number
    expires_in: number
    token_type: string
  }
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0]
  const shared = {
    domain: "127.0.0.1",
    path: "/",
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 400,
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }
  await page.context().addCookies([
    {
      name: `sb-${projectRef}-auth-token`,
      value: encodeAuthCookieValue(body, email),
      ...shared,
    },
    { name: CONSENT_COOKIE, value: CURRENT_CONSENT, ...shared },
  ])
}

test.describe("consulta de cidade", () => {
  test.use({ colorScheme: "light" })

  test("membro abre a própria cidade pela consulta, sem convite a mudar", async ({ page }) => {
    await signInAs(page, "membro-1@bivaque.example.invalid")
    await page.goto(`${APP_URL}/app/cidade/atual`, { waitUntil: "load" })

    await expect(page.getByRole("heading", { name: "Manaus, AM" })).toBeVisible({
      timeout: 20000,
    })
    // A própria cidade não oferece "vou me mudar para cá".
    await expect(page.locator('[data-acao="mudar-para-ca"]')).toHaveCount(0)
    // Sem erro de leitura nem endereço inexistente.
    await expect(page.getByText(/Não foi possível carregar|Este endereço não existe/)).toHaveCount(
      0,
    )
  })

  test("o chip abre a consulta de OUTRA cidade, com o Guia e os encontros de lá", async ({
    page,
  }) => {
    await signInAs(page, "membro-1@bivaque.example.invalid")
    await page.goto(`${APP_URL}/app/inicio`, { waitUntil: "load" })

    await page.locator('[data-acao="cidade"]').click()
    await page.locator('[data-selecao="cidade-uf"]').click()
    await page.getByRole("option", { name: "RJ", exact: true }).click()
    await page.locator('[data-selecao="cidade-municipio"]').click()
    await page.getByRole("option", { name: "Rio de Janeiro", exact: true }).click()
    await page.locator('[data-acao="abrir-cidade"]').click()

    await expect(page).toHaveURL(/\/app\/cidade\/[0-9a-f-]{36}$/)
    await expect(page.getByRole("heading", { name: "Rio de Janeiro, RJ" })).toBeVisible({
      timeout: 20000,
    })
    // Consulta não muda a cidade da sessão: publicar continua em Manaus.
    await expect(
      page.getByText("Você continua publicando e participando em Manaus", { exact: false }),
    ).toBeVisible()
    await expect(page.locator('[data-acao="mudar-para-ca"]')).toBeVisible()
  })

  test("quem é de fora abre uma referência da cidade consultada, em visita", async ({ page }) => {
    // `membro-vazia` é do Rio: Manaus é outra cidade para ela.
    await signInAs(page, "membro-vazia@bivaque.example.invalid")
    await page.goto(`${APP_URL}/app/cidade/${MANAUS}`, { waitUntil: "load" })

    const guia = page.locator('[data-tela="cidade"] section', {
      has: page.getByRole("heading", { name: "Guia de chegada" }),
    })
    const primeira = guia.locator('[data-linha="lista"]').first()
    await expect(primeira).toBeVisible({ timeout: 20000 })
    await primeira.click()

    await expect(page).toHaveURL(/\/app\/guia\/[0-9a-f-]{36}$/)
    // A referência abre; o que não existe para quem é de fora é salvar/sugerir.
    await expect(
      page.getByText("Esta referência é de outra cidade.", { exact: false }),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("Este endereço não existe")).toHaveCount(0)
  })
})
