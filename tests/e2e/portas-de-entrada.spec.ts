import { expect, test } from "@playwright/test"
import { signInAs } from "./helpers/session"

// Portas criadas em 22/09/2026 para rotas que só se alcançavam digitando a URL (achados do
// rastreador de links, tests/e2e/link-crawl.spec.ts). Aqui cada porta é CLICADA, e a que
// depende de ser dono tem o negativo junto. Só leitura: não cria nem altera linha.

const OWNER = "membro-27@bivaque.example.invalid"
const OTHER = "membro-1@bivaque.example.invalid"
const PROPERTY = "b2000000-0000-4000-8000-000000000001"

test.describe("portas de entrada", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1440, "portas iguais nas três larguras")

  test("dono do imóvel chega à edição pelo detalhe", async ({ page }) => {
    await signInAs(page.context(), OWNER)
    await page.goto(`/imoveis/${PROPERTY}`)
    await page.getByRole("link", { name: "Editar anúncio" }).click()
    await expect(page).toHaveURL(new RegExp(`/imoveis/${PROPERTY}/editar$`))
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 })
  })

  test("quem não é dono não vê a porta, e a URL direta não abre", async ({ page }) => {
    await signInAs(page.context(), OTHER)
    await page.goto(`/imoveis/${PROPERTY}`)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole("link", { name: "Editar anúncio" })).toHaveCount(0)
    // Com streaming, notFound() chega dentro de uma resposta 200: o que prova a negação é a
    // tela de não encontrado no lugar do formulário.
    await page.goto(`/imoveis/${PROPERTY}/editar`)
    await expect(page.getByText("Imóvel não encontrado")).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole("button", { name: /Salvar/ })).toHaveCount(0)
  })

  test("Imóveis leva a anunciar e a gerenciar alertas", async ({ page }) => {
    await signInAs(page.context(), OTHER)
    await page.goto("/imoveis")
    await page.getByRole("link", { name: "Anunciar imóvel" }).click()
    await expect(page).toHaveURL(/\/imoveis\/novo$/)
    await page.goto("/imoveis")
    await page.getByRole("link", { name: "Meus alertas" }).click()
    await expect(page).toHaveURL(/\/imoveis\/alertas$/)
  })

  test("o cartão do Guia abre a referência completa", async ({ page }) => {
    await signInAs(page.context(), OTHER)
    await page.goto("/guide")
    const card = page.locator("#guia-referencias").getByRole("heading", { level: 3 }).first()
    const name = (await card.innerText()).trim()
    await card.getByRole("link").click()
    await expect(page).toHaveURL(/\/guide\/[0-9a-f-]+$/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText(name)
  })
})

// O cabeçalho aparece nas três larguras, então esta porta é provada nas três.
test.describe("porta da caixa de conversas", () => {
  test("o ícone de conversas do cabeçalho abre a caixa", async ({ page }) => {
    await signInAs(page.context(), OTHER)
    await page.goto("/inicio")
    await page.getByRole("link", { name: /^Conversas/ }).click()
    await expect(page).toHaveURL(/\/messages/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 })
  })
})
