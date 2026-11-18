import { expect, test } from "@playwright/test"
import { signInAs } from "./helpers/session"

// Portas criadas em 22/09/2026 para rotas que só se alcançavam digitando a URL (achados do
// rastreador de links, tests/e2e/link-crawl.spec.ts). Aqui cada porta é CLICADA, e a que
// depende de ser dono tem o negativo junto. Só leitura: não cria nem altera linha.

const OTHER = "membro-1@bivaque.example.invalid"
const PROPERTY = "b2000000-0000-4000-8000-000000000001"
const GUIDE_ENTRY = "a0000000-0000-4000-8000-000000000003"

test.describe("portas de entrada", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1440, "portas iguais nas três larguras")

  test("quem não é dono não vê a porta, e a URL direta não abre", async ({ page }) => {
    await signInAs(page.context(), OTHER)
    await page.goto(`/imoveis/${PROPERTY}`)
    await expect(page).toHaveURL(new RegExp(`/app/anuncio/${PROPERTY}$`))
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole("link", { name: "Editar anúncio" })).toHaveCount(0)
    // RUN-164: a edição web saiu (307 para o app). Quem não é dono aterrissa no
    // anúncio, sem a porta de gestão — "Salvar alterações" só existe para o dono.
    await page.goto(`/imoveis/${PROPERTY}/editar`)
    await expect(page).toHaveURL(new RegExp(`/app/anuncio/${PROPERTY}$`))
    await expect(page.getByRole("button", { name: "Salvar alterações" })).toHaveCount(0)
  })

  test("a lista, o criar e os alertas migram para o app", async ({ page }) => {
    await signInAs(page.context(), OTHER)
    await page.goto("/imoveis")
    await expect(page).toHaveURL(/\/app\/imoveis$/)
    // Mesmo molde do desapego (RUN-156): o criar mora na folha do app, e a URL
    // antiga só leva à lista.
    await page.goto("/imoveis/novo")
    await expect(page).toHaveURL(/\/app\/imoveis$/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 })
    // RUN-169: a gestão dos alertas também é do app. A URL antiga aterrissa na
    // tela nova, com o título real dela.
    await page.goto("/imoveis/alertas")
    await expect(page).toHaveURL(/\/app\/imoveis\/alertas$/)
    await expect(
      page.getByRole("heading", { level: 1, name: "Alertas de imóvel", exact: true }),
    ).toBeVisible({ timeout: 20_000 })
  })

  test("a lista e o verbete do Guia migram para o app", async ({ page }) => {
    await signInAs(page.context(), OTHER)
    // A lista antiga agora responde 307 para o Guia do app.
    await page.goto("/guide")
    await expect(page).toHaveURL(/\/app\/guia$/)
    await expect(page.getByRole("heading", { level: 1, name: "Guia", exact: true })).toBeVisible({
      timeout: 20_000,
    })
    // O verbete também: a URL direta aterrissa na tela da referência, com o
    // nome no `h1` (o mesmo cabeçalho que a web mostrava) e a porta de correção.
    await page.goto(`/guide/${GUIDE_ENTRY}`)
    await expect(page).toHaveURL(new RegExp(`/app/guia/${GUIDE_ENTRY}$`))
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Transportadora Ajuricaba",
      {
        timeout: 20_000,
      },
    )
    await expect(page.getByRole("heading", { name: "Sugerir atualização" })).toBeVisible()
  })
})

// O cabeçalho aparece nas três larguras, então esta porta é provada nas três.
test.describe("porta da caixa de conversas", () => {
  test("o ícone de conversas do cabeçalho abre a caixa", async ({ page }) => {
    await signInAs(page.context(), OTHER)
    await page.goto("/inicio")
    await page.getByRole("button", { name: "Conversas", exact: true }).click()
    await expect(page).toHaveURL(/\/app\/conversas$/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 })
  })
})
