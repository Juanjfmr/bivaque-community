// Onda G Task 9 — os três ciclos da vitrine em E2E, contra o seed real.
//
// 1. Membro da vila acha o prestador pela busca da localidade e abre a ficha.
// 2. O prestador entra e publica um item de catálogo pelo painel.
// 3. O membro FORA do alcance não acha a ficha (a fronteira que a Task 7
//    venderá quando existir alcance pago).
//
// O aceite por magic link do convite é provado no banco por
// supabase/tests/provider-invitation.sql; este spec cobre o pós-login.
// Sem import.meta (specs viram CJS); credenciais no padrão público de
// descarte já usado pelos demais specs.

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"

async function signInAs(page: Page, email: string): Promise<void> {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  const password = process.env["USER_PASSWORD"] ?? "bivaque-e2e-local"
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required")

  const api = page.context().request
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password },
  })
  if (response.status() !== 200) {
    throw new Error(`Password grant for ${email} failed with ${response.status()}`)
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
    { name: "bivaque-consent-version", value: "1", ...shared },
  ])
}

test.describe("vitrine de prestadores", () => {
  test("membro da vila acha o prestador pela busca da localidade e abre a ficha", async ({
    page,
  }) => {
    await signInAs(page, "membro-1@bivaque.example.invalid")
    await page.setViewportSize({ width: 1280, height: 800 })

    await page.goto("/localidade")

    // Timeout generoso no primeiro assert: cold start de lote serial.
    const busca = page.getByLabel("Buscar por nome")
    await expect(busca).toBeVisible({ timeout: 20000 })
    await busca.fill("climatiza")
    await page.getByRole("button", { name: "Buscar" }).click()

    await page.getByRole("link", { name: /Climatiza Manaus/ }).click()

    await expect(page.getByRole("heading", { name: "Climatiza Manaus" })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByRole("heading", { name: "Catálogo" })).toBeVisible()
    await expect(page.getByText("Higienização da evaporadora")).toBeVisible()
  })

  test("prestador entra e publica um item de catálogo", async ({ page }) => {
    // Ciclo completo (navegar, preencher três campos, publicar por Server
    // Action, revalidar) contra servidor recém-compilado em lote serial não
    // cabe no teto padrão de 30s — visto em 2026-08-25.
    test.setTimeout(90_000)

    await signInAs(page, "prestador-seed@bivaque.example.invalid")
    await page.setViewportSize({ width: 1280, height: 800 })

    await page.goto("/prestador/catalogo")

    await expect(page.getByRole("heading", { name: "Publicar item" })).toBeVisible({
      timeout: 20000,
    })

    // Escopado no formulário de publicação: sem isto, os rótulos curtos
    // colidem com os campos de edição dos itens já listados abaixo.
    const publicar = page.getByRole("form", { name: "Publicar item" })
    await publicar.getByLabel("Título do item").fill("Instalação de split")
    await publicar.getByLabel("Descrição").fill("Instalação completa com gás incluso")
    await publicar.getByLabel("Preço em centavos").fill("25000")
    await publicar.getByRole("button", { name: "Publicar" }).click()

    // TEMPORÁRIO (diagnóstico): estado da página logo após a ação.
    await page.waitForTimeout(2500)
    console.log("DBG_B_pos_url:", page.url())
    const corpoPos = await page.locator("body").innerText()
    console.log(
      "DBG_B_tem_item:",
      corpoPos.includes("Instalação de split"),
      "| DBG_B_erro_global:",
      /application error|ocorreu um erro/i.test(corpoPos),
      "| DBG_B_cauda:",
      corpoPos.slice(-260).replace(/\s+/g, " | "),
    )

    // .first(): títulos repetidos são permitidos no catálogo — execuções
    // anteriores do próprio spec podem ter publicado o mesmo nome.
    await expect(page.getByText("Instalação de split").first()).toBeVisible({
      timeout: 10000,
    })
  })

  test("membro fora do alcance não acha a ficha", async ({ page }) => {
    await signInAs(page, "membro-vazia@bivaque.example.invalid")
    await page.setViewportSize({ width: 1280, height: 800 })

    await page.goto("/localidade")

    // §3.4 e Task 5 Step 3: sem FICHA nenhuma no alcance do chamador, o
    // estado é o vazio honesto SEM formulário de filtro ("mostre o filtro
    // só quando houver ficha") — e Climatiza Manaus não aparece em lugar
    // nenhum da página.
    await expect(page.getByText("Ainda não há prestadores cadastrados por aqui.")).toBeVisible({
      timeout: 20000,
    })
    await expect(page.getByRole("link", { name: /Climatiza Manaus/ })).toHaveCount(0)
  })
})
