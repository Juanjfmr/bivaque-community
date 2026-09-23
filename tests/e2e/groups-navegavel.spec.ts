import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue } from "./helpers/session"

// FE-GRUPOS-ALCANCAVEIS (19/09/2026) — prova de NAVEGAÇÃO, não de existência.
//
// O defeito reportado pelo dono contra produção (`main` 90e4c94): "há um grupo
// corrida no meu login e ele não aparece em lugar nenhum". Medido: `/groups` era
// a única lista de grupos de cidade e não tinha entrada na navegação — só links
// condicionais; e a aba "Grupos" de uma comunidade filtra por `community_id`,
// que nenhum grupo criado pelo app tem.
//
// Este spec percorre o caminho que o membro percorre — shell → Comunidades →
// Seus grupos → grupo — sem digitar URL no meio. `groups-state-truth.spec.ts`
// navega direto para `/groups` de propósito (ele testa estado de erro daquela
// tela); aqui o que se prova é que a pessoa chega lá pelo produto.
//
// Caminho relativo (`page.goto("/...")`): quem decide o servidor é o `baseURL` do
// playwright.config.ts. Uma porta fixa do dev server de outra sessão derrubava o
// arquivo inteiro em CI — mesma correção de `feed-attachment-publish` (73111110).

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
const MEMBER_EMAIL = "membro-1@bivaque.example.invalid"
const TRANSFERRING_EMAIL =
  process.env["BIVAQUE_E2E_TRANSFERRING_EMAIL"] ?? "membro-transferencia@bivaque.example.invalid"

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

async function signInAs(page: Page, email: string): Promise<void> {
  const { anonKey, password } = requireCredentials()
  const api = page.context().request
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password },
  })
  if (response.status() !== 200) {
    throw new Error(
      `Password grant for ${email} failed with ${response.status()}. Is the local Supabase stack running and seeded?`,
    )
  }
  const body = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_at: number
    expires_in: number
    token_type: string
  }
  const cookieValue = encodeAuthCookieValue(body, email)
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
    { name: CONSENT_COOKIE, value: CURRENT_CONSENT, ...shared },
  ])
}

test.describe("FE-GRUPOS-ALCANCAVEIS — o grupo do membro é alcançável", () => {
  test("do shell até o grupo, sem digitar URL", async ({ page }) => {
    await signInAs(page, MEMBER_EMAIL)
    await page.goto("/inicio", { waitUntil: "load" })

    // 1. Navegação primária: Comunidades. O mesmo landmark serve a sidebar
    //    (>= md) e a barra inferior (< md); `exact` evita casar com a seção
    //    "Minhas comunidades".
    const primaryNav = page.getByRole("navigation", { name: "Navegação principal" })
    await primaryNav.getByText("Comunidades", { exact: true }).click()
    await page.waitForURL(/\/communities/)

    // 2. Na aba padrão, o membro vê o PRÓPRIO grupo
    const myGroups = page.getByRole("region", { name: "Seus grupos" })
    await expect(myGroups).toBeVisible()
    await expect(myGroups.getByText("Corrida às Terças")).toBeVisible()

    // 3. E chega nele por link — não por URL digitada
    await myGroups.getByRole("link", { name: "Ver grupo" }).first().click()
    await page.waitForURL(/\/groups\/[0-9a-f-]{36}/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Corrida às Terças")
  })

  test("a descoberta lista os grupos de cidade do destino Comunidades", async ({ page }) => {
    await signInAs(page, MEMBER_EMAIL)
    await page.goto("/communities", { waitUntil: "load" })

    await page.getByRole("tab", { name: "Descobrir" }).click()

    const cityGroups = page.getByRole("region", { name: "Grupos da cidade" })
    await expect(cityGroups).toBeVisible()
    await expect(cityGroups.getByText("Caminhada no Mindu")).toBeVisible()
    await expect(cityGroups.getByRole("link", { name: "Ver grupo" }).first()).toBeVisible()
  })

  test("quem declarou transferência vê a cidade de destino E a de origem, rotulada", async ({
    page,
  }) => {
    await signInAs(page, TRANSFERRING_EMAIL)
    await page.goto("/groups", { waitUntil: "load" })

    // O shell e a lista concordam sobre onde a pessoa está.
    await expect(page.getByTestId("shell-locality-pill")).toContainText("Rio de Janeiro")

    // A cidade de DESTINO não pode faltar: era exatamente o que o `.limit(1)`
    // sem `kind` derrubava, porque devolvia a linha 'leaving' (a origem).
    // Locator por PAPEL: `getByText("Corrida na Orla")` casa também com a
    // descrição ("Encontros de corrida na orla…") por substring, e o modo
    // estrito do Playwright reprova os dois elementos.
    await expect(page.getByRole("heading", { name: "Corrida na Orla" })).toBeVisible()

    // E a cidade de ORIGEM continua na lista, marcada: o vínculo de saída segue
    // legível e publicável até o prazo declarado (ADR-20260816).
    await expect(page.getByText("Manaus, AM").first()).toBeVisible()
  })
})
